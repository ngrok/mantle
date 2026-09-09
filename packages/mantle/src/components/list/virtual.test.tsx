import type * as ReactVirtualModule from "@tanstack/react-virtual";
import { act, render } from "@testing-library/react";
import type { ReactElement } from "react";
import type { Root } from "react-dom/client";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { Item } from "./primitive.js";
import { VirtualRoot } from "./virtual.js";

type GetItemKey = (index: number) => unknown;

const captured = vi.hoisted((): { getItemKeys: Array<GetItemKey | undefined> } => ({
	getItemKeys: [],
}));

// Why wrap `useVirtualizer`: the contract under test is the identity of the
// `getItemKey` option that `VirtualRoot` passes. Nothing in the DOM exposes it,
// so the wrapper records that option and calls the real hook.
vi.mock("@tanstack/react-virtual", async (importOriginal) => {
	const actual = await importOriginal<typeof ReactVirtualModule>();
	const useVirtualizer: typeof actual.useVirtualizer = (options) => {
		captured.getItemKeys.push(options.getItemKey);
		return actual.useVirtualizer(options);
	};
	return { ...actual, useVirtualizer };
});

const rows = Array.from({ length: 30 }, (_, index) => ({
	id: `row-${index}`,
	name: `Row ${index}`,
}));

function renderRows(order: typeof rows) {
	return order.map((row) => (
		<Item key={row.id}>
			<button type="button">{row.name}</button>
		</Item>
	));
}

function lastGetItemKey(): GetItemKey {
	const last = captured.getItemKeys[captured.getItemKeys.length - 1];
	if (last == null) {
		throw new Error("useVirtualizer was not called with a getItemKey");
	}
	return last;
}

describe("VirtualRoot virtualizer options", () => {
	beforeEach(() => {
		captured.getItemKeys.length = 0;
	});

	test("getItemKey keeps its identity across a re-render with the same children", () => {
		// Regression: an inline `getItemKey` closure was a new function on every
		// render, so virtual-core rebuilt every measurement and handed each mounted
		// row a new `virtualItem` each time the visible window moved.
		const children = renderRows(rows);
		const { rerender } = render(<VirtualRoot aria-label="Rows">{children}</VirtualRoot>);
		const initial = lastGetItemKey();

		rerender(<VirtualRoot aria-label="Rows">{children}</VirtualRoot>);

		expect(lastGetItemKey()).toBe(initial);
	});

	test("getItemKey follows a new children array, so keys track a reorder", () => {
		const { rerender } = render(<VirtualRoot aria-label="Rows">{renderRows(rows)}</VirtualRoot>);
		const initial = lastGetItemKey();

		rerender(<VirtualRoot aria-label="Rows">{renderRows(rows.toReversed())}</VirtualRoot>);
		const next = lastGetItemKey();

		expect(next).not.toBe(initial);
		// The first windowed row now carries the key of what used to be the last row.
		expect(next(0)).toBe(initial(rows.length - 1));
		expect(next(0)).not.toBe(initial(0));
	});
});

describe("VirtualRoot server render", () => {
	function serverRows(element: ReactElement): NodeListOf<Element> {
		const template = document.createElement("template");
		template.innerHTML = renderToString(element);
		return template.content.querySelectorAll('[role="listitem"]');
	}

	test("renders the first slice of rows instead of an empty collection", () => {
		// Regression: with no `initialRect`, virtual-core saw a zero-height viewport
		// on the server and windowed no rows at all.
		const listItems = serverRows(<VirtualRoot aria-label="Rows">{renderRows(rows)}</VirtualRoot>);

		expect(listItems.length).toBeGreaterThan(0);
		// Still windowed: the server does not fall back to rendering every row.
		expect(listItems.length).toBeLessThan(rows.length);
		expect(listItems[0]).toHaveAttribute("aria-posinset", "1");
		expect(listItems[0]).toHaveAttribute("aria-setsize", String(rows.length));
	});

	test("the slice covers at least the first row when overscan is 0", () => {
		// The seed must size at least one estimated row; a seed of
		// `estimateItemHeight * overscan` would collapse to zero here.
		const listItems = serverRows(
			<VirtualRoot aria-label="Rows" overscan={0}>
				{renderRows(rows)}
			</VirtualRoot>,
		);

		expect(listItems.length).toBe(1);
	});

	test("hydrates the server HTML without a mismatch", () => {
		// The seed applies to the server render and the first client render alike.
		// If it applies on one side only, the row counts disagree. React reports
		// that as a recoverable hydration error.
		const element = <VirtualRoot aria-label="Rows">{renderRows(rows)}</VirtualRoot>;
		const container = document.createElement("div");
		container.innerHTML = renderToString(element);
		document.body.append(container);
		const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
		const onRecoverableError = vi.fn<(error: unknown) => void>();

		let root: Root | undefined;
		act(() => {
			root = hydrateRoot(container, element, { onRecoverableError });
		});

		expect(onRecoverableError).toHaveBeenCalledTimes(0);
		expect(consoleError).toHaveBeenCalledTimes(0);

		act(() => {
			root?.unmount();
		});
		container.remove();
	});
});
