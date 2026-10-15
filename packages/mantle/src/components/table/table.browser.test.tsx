"use client";

import { render, screen, waitFor } from "@testing-library/react";
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import { Table } from "./table.js";

// Why inline CSS: the browser project loads no stylesheet, and the overflow
// state needs a scroller that clips its table. This mirrors the `overflow-x-auto`
// utility on `Table.Root`'s inner scroller.
const STYLE = `
[data-slot="table"] > div { overflow-x: auto; }
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

function renderTable({ rootWidth, tableWidth }: { rootWidth: number; tableWidth: number }) {
	return render(
		<Table.Root data-testid="root" style={{ width: rootWidth }}>
			<Table.Element style={{ width: tableWidth }}>
				<Table.Body>
					<Table.Row>
						<Table.Cell>INV001</Table.Cell>
						<Table.Cell>$250.00</Table.Cell>
					</Table.Row>
				</Table.Body>
			</Table.Element>
		</Table.Root>,
	);
}

/** A table whose width grows with its column count, so a re-render can append content. */
function ColumnsTable({ columns }: { columns: number }) {
	return (
		<Table.Root data-testid="root" style={{ width: 200 }}>
			<Table.Element>
				<Table.Body>
					<Table.Row>
						{Array.from({ length: columns }, (_, index) => (
							<Table.Cell key={index} style={{ minWidth: 240 }}>
								Value {index + 1}
							</Table.Cell>
						))}
					</Table.Row>
				</Table.Body>
			</Table.Element>
		</Table.Root>
	);
}

function requireScroller(): HTMLElement {
	const scroller = screen.getByRole("table").parentElement;
	if (scroller == null) {
		throw new Error("the table has no scroller");
	}
	return scroller;
}

describe("Table.Root overflow observer", () => {
	test("the first layout read waits for the browser, not React's commit", async () => {
		// Why the getter spy: a `scrollWidth` read forces a layout. The regression
		// this pins is a synchronous read inside the layout effect, which would run
		// before `render` returns.
		const scrollWidth = vi.spyOn(Element.prototype, "scrollWidth", "get");

		renderTable({ rootWidth: 200, tableWidth: 800 });
		expect(scrollWidth).not.toHaveBeenCalled();

		const root = screen.getByTestId("root");
		await waitFor(() => {
			expect(root).toHaveAttribute("data-x-overflow", "true");
		});
	});

	test("the overflow attributes update before the first frame paints", async () => {
		// Why a second observer: the browser broadcasts every ResizeObserver's
		// notifications in creation order, all before paint. This one is created
		// after `Table.Root`'s, so it reads what the first painted frame will show.
		// The regression it pins is a `setState` without `flushSync`, which would
		// leave the attributes at their initial `"false"` until the next React task.
		renderTable({ rootWidth: 200, tableWidth: 800 });
		const root = screen.getByTestId("root");

		const seenBeforePaint = await new Promise<string | null>((resolve) => {
			const observer = new ResizeObserver(() => {
				observer.disconnect();
				resolve(root.getAttribute("data-x-overflow"));
			});
			observer.observe(root);
		});

		expect(seenBeforePaint).toBe("true");
	});

	test("an overflowing table flags overflow and the sticky column, then clears them at the end", async () => {
		renderTable({ rootWidth: 200, tableWidth: 800 });
		const root = screen.getByTestId("root");
		const scroller = screen.getByRole("table").parentElement;
		if (scroller == null) {
			throw new Error("the table has no scroller");
		}

		await waitFor(() => {
			expect(root).toHaveAttribute("data-x-overflow", "true");
		});
		expect(root).toHaveAttribute("data-x-scroll-end", "false");
		expect(root).toHaveAttribute("data-sticky-active", "true");

		scroller.scrollLeft = scroller.scrollWidth;

		await waitFor(() => {
			expect(root).toHaveAttribute("data-x-scroll-end", "true");
		});
		expect(root).toHaveAttribute("data-x-overflow", "true");
		expect(root).not.toHaveAttribute("data-sticky-active");
	});

	test("stopping short of the right edge is not the end: the tolerance stays sub-pixel", async () => {
		renderTable({ rootWidth: 200, tableWidth: 800 });
		const root = screen.getByTestId("root");
		const scroller = requireScroller();

		await waitFor(() => {
			expect(root).toHaveAttribute("data-sticky-active", "true");
		});
		scroller.scrollLeft = scroller.scrollWidth;
		await waitFor(() => {
			expect(root).toHaveAttribute("data-x-scroll-end", "true");
		});

		// 3px of unscrolled content: 2px outside the 1px tolerance in
		// `useHorizontalOverflowObserver`. The fixture's geometry is whole-pixel, so
		// the gap is exactly 3. A larger gap would stay green for any tolerance
		// under it, and a "fix the flaky scrollLeft" widening would strand the fade off.
		scroller.scrollLeft = scroller.scrollWidth - scroller.clientWidth - 3;

		await waitFor(() => {
			expect(root).toHaveAttribute("data-x-scroll-end", "false");
		});
		expect(root).toHaveAttribute("data-sticky-active", "true");
	});

	test("a column appended while parked at the right edge re-evaluates the scroll position", async () => {
		// The scroller is already overflowing and `scrollLeft` does not move, so the
		// scroll listener cannot cover this. Only the MutationObserver notices the
		// wider content; without it the pinned column's fade stays off with content
		// still to scroll under it.
		const { rerender } = render(<ColumnsTable columns={3} />);
		const root = screen.getByTestId("root");
		const scroller = requireScroller();

		await waitFor(() => {
			expect(root).toHaveAttribute("data-sticky-active", "true");
		});
		scroller.scrollLeft = scroller.scrollWidth;
		await waitFor(() => {
			expect(root).toHaveAttribute("data-x-scroll-end", "true");
		});
		const scrollLeftAtEdge = scroller.scrollLeft;

		rerender(<ColumnsTable columns={4} />);

		await waitFor(() => {
			expect(root).toHaveAttribute("data-x-scroll-end", "false");
		});
		expect(root).toHaveAttribute("data-sticky-active", "true");
		// The premise: the appended column grew the scrollable width without moving
		// the scroll position.
		expect(scroller.scrollLeft).toBe(scrollLeftAtEdge);
		expect(scroller.scrollWidth - scroller.clientWidth).toBeGreaterThan(scrollLeftAtEdge);
	});

	test("shrinking the container re-evaluates overflow", async () => {
		const scrollWidth = vi.spyOn(Element.prototype, "scrollWidth", "get");
		renderTable({ rootWidth: 800, tableWidth: 400 });
		const root = screen.getByTestId("root");

		await waitFor(() => {
			expect(scrollWidth).toHaveBeenCalled();
		});
		expect(root).toHaveAttribute("data-x-overflow", "false");

		// Resized outside React, as an attribute mutation on an ancestor: invisible
		// to the `{ childList, subtree }` MutationObserver on the scroller, so only
		// the ResizeObserver can catch it.
		root.style.width = "200px";

		await waitFor(() => {
			expect(root).toHaveAttribute("data-x-overflow", "true");
		});
		expect(root).toHaveAttribute("data-sticky-active", "true");
	});

	test("a table that fits reports no overflow after the first read", async () => {
		const scrollWidth = vi.spyOn(Element.prototype, "scrollWidth", "get");
		renderTable({ rootWidth: 800, tableWidth: 200 });
		const root = screen.getByTestId("root");

		// The observer's first notification is the readiness signal; the
		// assertions below are about the values it produced.
		await waitFor(() => {
			expect(scrollWidth).toHaveBeenCalled();
		});
		expect(root).toHaveAttribute("data-x-overflow", "false");
		expect(root).toHaveAttribute("data-x-scroll-end", "false");
		expect(root).not.toHaveAttribute("data-sticky-active");
	});
});
