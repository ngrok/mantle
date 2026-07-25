"use client";

import { render, screen, waitFor } from "@testing-library/react";
import { createRef, type Ref } from "react";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { Table } from "./index.js";

/**
 * `Table.Root`'s overflow engine reads real `scrollWidth` / `clientWidth` /
 * `scrollLeft` and is driven by ResizeObserver, MutationObserver and rAF — in
 * happy-dom every one of those measurements is 0, so these assertions would pass
 * vacuously there. Browser mode loads no Tailwind build, so the structural
 * layout the Root's utilities provide is inlined below; keeping the selectors
 * `data-slot`-based means they track the component's public parts.
 */
const STYLE = `
[data-slot="table"] {
	position: relative;
	width: 100%;
	overflow: hidden;
}
[data-slot="table"] > div {
	overflow-x: auto;
}
[data-slot="table-element"] {
	border-collapse: separate;
	border-spacing: 0;
	text-align: left;
}
[data-slot="table-header"],
[data-slot="table-cell"] {
	padding: 0;
	white-space: nowrap;
}
/* Mirrors DataTable.ActionCell's scroll-under gradient
   (\`opacity-0 group-data-sticky-active/table:opacity-100\` in data-table.tsx):
   it resolves only against Table.Root's \`group/table\` marker class plus its
   \`data-sticky-active\` attribute, so the computed opacity below is a real test
   of that cross-component contract. */
.sticky-fade {
	opacity: 0;
}
.group\\/table[data-sticky-active] .sticky-fade {
	opacity: 1;
}
`;

let styleElement: HTMLStyleElement;

beforeAll(() => {
	styleElement = document.createElement("style");
	styleElement.textContent = STYLE;
	document.head.appendChild(styleElement);
});

afterAll(() => {
	styleElement.remove();
});

const COLUMN_WIDTH = 240;

type TableProps = {
	columns: number;
	scrollRef?: Ref<HTMLDivElement>;
	viewportWidth: number;
};

const OverflowTable = ({ columns, scrollRef, viewportWidth }: TableProps) => (
	<div data-testid="viewport" style={{ width: viewportWidth }}>
		<Table.Root ref={scrollRef}>
			<Table.Element>
				<Table.Head>
					<Table.Row>
						{Array.from({ length: columns }, (_, index) => (
							<Table.Header key={index} style={{ minWidth: COLUMN_WIDTH }}>
								Column {index + 1}
							</Table.Header>
						))}
					</Table.Row>
				</Table.Head>
				<Table.Body>
					<Table.Row>
						{Array.from({ length: columns }, (_, index) => (
							<Table.Cell key={index} style={{ minWidth: COLUMN_WIDTH }}>
								Value {index + 1}
								{index === columns - 1 && <span className="sticky-fade" data-testid="fade" />}
							</Table.Cell>
						))}
					</Table.Row>
				</Table.Body>
			</Table.Element>
		</Table.Root>
	</div>
);

/** Resolve on the next animation frame — the granularity the observer coalesces to. */
const nextFrame = (): Promise<number> =>
	new Promise((resolve) => {
		requestAnimationFrame(resolve);
	});

const setup = (props: Omit<TableProps, "scrollRef">) => {
	const scrollRef = createRef<HTMLDivElement>();
	const { rerender } = render(<OverflowTable {...props} scrollRef={scrollRef} />);

	const scroller = scrollRef.current;
	if (scroller == null) {
		throw new Error("expected the Table.Root ref to attach to the scroll container");
	}
	const root = scroller.parentElement;
	if (!(root instanceof HTMLElement) || root.dataset.slot !== "table") {
		throw new Error('expected the scroll container to be a child of [data-slot="table"]');
	}

	return {
		root,
		scroller,
		viewport: screen.getByTestId("viewport"),
		rerender: (next: Omit<TableProps, "scrollRef">) =>
			rerender(<OverflowTable {...next} scrollRef={scrollRef} />),
	};
};

/** Park the scroll container `gap` pixels short of its right edge. */
const scrollTo = (scroller: HTMLDivElement, gap: number) => {
	scroller.scrollLeft = scroller.scrollWidth - scroller.clientWidth - gap;
};

describe("Table.Root horizontal overflow", () => {
	test("a table wider than its container reports overflow and activates the sticky state", async () => {
		const { root, scroller } = setup({ columns: 3, viewportWidth: 320 });

		// Guards against a vacuous pass: the geometry has to actually overflow.
		await waitFor(() => {
			expect(scroller.scrollWidth).toBeGreaterThan(scroller.clientWidth);
		});
		await waitFor(() => {
			expect(root).toHaveAttribute("data-x-overflow", "true");
			expect(root).toHaveAttribute("data-sticky-active", "true");
			expect(root).toHaveAttribute("data-x-scroll-end", "false");
		});
	});

	test("a table that fits reports no overflow and never activates the sticky state", async () => {
		const { root, scroller } = setup({ columns: 2, viewportWidth: 900 });

		await waitFor(() => {
			expect(scroller.clientWidth).toBeGreaterThan(0);
		});
		expect(scroller.scrollWidth).toBe(scroller.clientWidth);
		// There is nothing to wait FOR here — the claim is that no frame flips the
		// state — so give the observers several frames to misfire.
		for (let frame = 0; frame < 3; frame++) {
			await nextFrame();
		}
		expect(root).toHaveAttribute("data-x-overflow", "false");
		expect(root).toHaveAttribute("data-x-scroll-end", "false");
		expect(root).not.toHaveAttribute("data-sticky-active");
	});

	test("reaching the right edge sets data-x-scroll-end and clears data-sticky-active", async () => {
		const { root, scroller } = setup({ columns: 3, viewportWidth: 320 });

		await waitFor(() => {
			expect(root).toHaveAttribute("data-sticky-active", "true");
		});

		scrollTo(scroller, 0);

		await waitFor(() => {
			expect(root).toHaveAttribute("data-x-scroll-end", "true");
			// The pinned column's scroll-under gradient hides once nothing is left to
			// scroll under it.
			expect(root).not.toHaveAttribute("data-sticky-active");
			// Overflow itself is unchanged — only the scroll position moved.
			expect(root).toHaveAttribute("data-x-overflow", "true");
		});
	});

	test("stopping short of the right edge is not the end — the tolerance stays sub-pixel", async () => {
		const { root, scroller } = setup({ columns: 3, viewportWidth: 320 });

		await waitFor(() => {
			expect(root).toHaveAttribute("data-sticky-active", "true");
		});
		scrollTo(scroller, 0);
		await waitFor(() => {
			expect(root).toHaveAttribute("data-x-scroll-end", "true");
		});

		// 20px of unscrolled content left: widening the 1px tolerance (or flipping
		// its sign) would keep reporting the end here and strand the fade off.
		scrollTo(scroller, 20);

		await waitFor(() => {
			expect(root).toHaveAttribute("data-x-scroll-end", "false");
			expect(root).toHaveAttribute("data-sticky-active", "true");
		});
	});

	test("scrolling back to the left restores data-sticky-active", async () => {
		const { root, scroller } = setup({ columns: 3, viewportWidth: 320 });

		await waitFor(() => {
			expect(root).toHaveAttribute("data-sticky-active", "true");
		});
		scrollTo(scroller, 0);
		await waitFor(() => {
			expect(root).not.toHaveAttribute("data-sticky-active");
		});

		scroller.scrollLeft = 0;

		await waitFor(() => {
			expect(root).toHaveAttribute("data-sticky-active", "true");
			expect(root).toHaveAttribute("data-x-scroll-end", "false");
		});
	});

	test("a column appended while parked at the right edge re-evaluates the scroll position", async () => {
		// The scroll container is already overflowing and scrollLeft does not move,
		// so the scroll listener cannot cover this: the observer pair watching the
		// container is the only thing that can notice the wider content. Deleting
		// both leaves this state stale — the pinned column's fade would stay off
		// with content still to scroll.
		const { root, scroller, rerender } = setup({ columns: 3, viewportWidth: 320 });

		await waitFor(() => {
			expect(root).toHaveAttribute("data-sticky-active", "true");
		});
		scrollTo(scroller, 0);
		await waitFor(() => {
			expect(root).toHaveAttribute("data-x-scroll-end", "true");
		});
		const scrollLeftAtEdge = scroller.scrollLeft;

		rerender({ columns: 4, viewportWidth: 320 });

		await waitFor(() => {
			expect(root).toHaveAttribute("data-x-scroll-end", "false");
			expect(root).toHaveAttribute("data-sticky-active", "true");
		});
		// The premise: the appended column grew the scrollable width without moving
		// the scroll position.
		expect(scroller.scrollLeft).toBe(scrollLeftAtEdge);
		expect(scroller.scrollWidth - scroller.clientWidth).toBeGreaterThan(scrollLeftAtEdge);
	});

	test("shrinking the container re-evaluates overflow", async () => {
		const { root, scroller, viewport } = setup({ columns: 1, viewportWidth: 400 });

		await waitFor(() => {
			expect(scroller.clientWidth).toBeGreaterThan(0);
		});
		expect(root).toHaveAttribute("data-x-overflow", "false");

		// Resized outside React, and an attribute mutation on an ancestor at that —
		// invisible to the { childList, subtree } MutationObserver, so only the
		// ResizeObserver can catch it.
		viewport.style.width = "150px";

		await waitFor(() => {
			expect(root).toHaveAttribute("data-x-overflow", "true");
			expect(root).toHaveAttribute("data-sticky-active", "true");
		});
	});

	test("the DataTable sticky fade resolves against the root's group and sticky attribute", async () => {
		const { root, scroller } = setup({ columns: 3, viewportWidth: 320 });
		const fade = screen.getByTestId("fade");

		await waitFor(() => {
			expect(root).toHaveAttribute("data-sticky-active", "true");
			expect(getComputedStyle(fade).opacity).toBe("1");
		});

		scrollTo(scroller, 0);

		await waitFor(() => {
			expect(getComputedStyle(fade).opacity).toBe("0");
		});
	});
});
