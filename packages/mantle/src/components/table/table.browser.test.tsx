"use client";

import { render, screen, waitFor } from "@testing-library/react";
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import * as Table from "./table-parts.js";

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
			expect(root).toHaveAttribute("data-x-overflow", "");
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

		expect(seenBeforePaint).toBe("");
	});

	test("an overflowing table flags overflow and the sticky column, then clears them at the end", async () => {
		renderTable({ rootWidth: 200, tableWidth: 800 });
		const root = screen.getByTestId("root");
		const scroller = screen.getByRole("table").parentElement;
		if (scroller == null) {
			throw new Error("the table has no scroller");
		}

		await waitFor(() => {
			expect(root).toHaveAttribute("data-x-overflow", "");
		});
		expect(root).not.toHaveAttribute("data-x-scroll-end");
		expect(root).toHaveAttribute("data-sticky-active", "");

		scroller.scrollLeft = scroller.scrollWidth;

		await waitFor(() => {
			expect(root).toHaveAttribute("data-x-scroll-end", "");
		});
		expect(root).toHaveAttribute("data-x-overflow", "");
		expect(root).not.toHaveAttribute("data-sticky-active");
	});

	test("stopping short of the right edge is not the end: the tolerance stays sub-pixel", async () => {
		renderTable({ rootWidth: 200, tableWidth: 800 });
		const root = screen.getByTestId("root");
		const scroller = requireScroller();

		await waitFor(() => {
			expect(root).toHaveAttribute("data-sticky-active", "");
		});
		scroller.scrollLeft = scroller.scrollWidth;
		await waitFor(() => {
			expect(root).toHaveAttribute("data-x-scroll-end", "");
		});

		// 3px of unscrolled content: 2px outside the 1px tolerance in
		// `useHorizontalOverflowObserver`. The fixture's geometry is whole-pixel, so
		// the gap is exactly 3. A larger gap would stay green for any tolerance
		// under it, and a "fix the flaky scrollLeft" widening would strand the fade off.
		scroller.scrollLeft = scroller.scrollWidth - scroller.clientWidth - 3;

		await waitFor(() => {
			expect(root).not.toHaveAttribute("data-x-scroll-end");
		});
		expect(root).toHaveAttribute("data-sticky-active", "");
	});

	test("a column appended while parked at the right edge re-evaluates the scroll position", async () => {
		// The scroller is already overflowing and `scrollLeft` does not move, so the
		// scroll listener cannot cover this. Only the observed table notices the
		// wider content; without it the pinned column's fade stays off with content
		// still to scroll under it.
		const { rerender } = render(<ColumnsTable columns={3} />);
		const root = screen.getByTestId("root");
		const scroller = requireScroller();

		await waitFor(() => {
			expect(root).toHaveAttribute("data-sticky-active", "");
		});
		scroller.scrollLeft = scroller.scrollWidth;
		await waitFor(() => {
			expect(root).toHaveAttribute("data-x-scroll-end", "");
		});
		const scrollLeftAtEdge = scroller.scrollLeft;

		rerender(<ColumnsTable columns={4} />);

		await waitFor(() => {
			expect(root).not.toHaveAttribute("data-x-scroll-end");
		});
		expect(root).toHaveAttribute("data-sticky-active", "");
		// The premise: the appended column grew the scrollable width without moving
		// the scroll position.
		expect(scroller.scrollLeft).toBe(scrollLeftAtEdge);
		expect(scroller.scrollWidth - scroller.clientWidth).toBeGreaterThan(scrollLeftAtEdge);
	});

	test("a table that replaces another one keeps the overflow state current as it grows", async () => {
		// Why grow the new table: the root starts to observe before the new table
		// mounts, and a wider table at the same height leaves the scroll container
		// at its size.
		function SwappedTable({ generation, width }: { generation: number; width: number }) {
			return (
				<Table.Root data-testid="root" style={{ width: 400 }}>
					<Table.Element key={generation} style={{ width }}>
						<Table.Body>
							<Table.Row>
								<Table.Cell>INV001</Table.Cell>
							</Table.Row>
						</Table.Body>
					</Table.Element>
				</Table.Root>
			);
		}
		const { rerender } = render(<SwappedTable generation={1} width={200} />);
		const root = screen.getByTestId("root");
		const firstTable = screen.getByRole("table");
		const scrollWidth = vi.spyOn(Element.prototype, "scrollWidth", "get");
		rerender(<SwappedTable generation={2} width={200} />);
		expect(screen.getByRole("table")).not.toBe(firstTable);
		await waitFor(() => {
			// oxlint-disable-next-line mantle/no-bare-to-have-been-called -- Why: the first read of the new table is a readiness signal, so the count does not matter.
			expect(scrollWidth).toHaveBeenCalled();
		});
		expect(root).not.toHaveAttribute("data-x-overflow");

		rerender(<SwappedTable generation={2} width={800} />);

		await waitFor(() => {
			expect(root).toHaveAttribute("data-x-overflow", "");
		});
		expect(root).toHaveAttribute("data-sticky-active", "");
	});

	test("a table inside a wrapper keeps the overflow state current as it grows", async () => {
		function WrappedTable({ width }: { width: number }) {
			return (
				<Table.Root data-testid="root" style={{ width: 400 }}>
					<div>
						<Table.Element style={{ width }}>
							<Table.Body>
								<Table.Row>
									<Table.Cell>INV001</Table.Cell>
								</Table.Row>
							</Table.Body>
						</Table.Element>
					</div>
				</Table.Root>
			);
		}
		const scrollWidth = vi.spyOn(Element.prototype, "scrollWidth", "get");
		const { rerender } = render(<WrappedTable width={200} />);
		const root = screen.getByTestId("root");
		await waitFor(() => {
			// oxlint-disable-next-line mantle/no-bare-to-have-been-called -- Why: the first read is a readiness signal, so the count does not matter.
			expect(scrollWidth).toHaveBeenCalled();
		});
		expect(root).not.toHaveAttribute("data-x-overflow");

		rerender(<WrappedTable width={800} />);

		await waitFor(() => {
			expect(root).toHaveAttribute("data-x-overflow", "");
		});
	});

	test("shrinking the container re-evaluates overflow", async () => {
		const scrollWidth = vi.spyOn(Element.prototype, "scrollWidth", "get");
		renderTable({ rootWidth: 800, tableWidth: 400 });
		const root = screen.getByTestId("root");

		await waitFor(() => {
			// oxlint-disable-next-line mantle/no-bare-to-have-been-called -- Why: the first read is a readiness signal, so the count does not matter.
			expect(scrollWidth).toHaveBeenCalled();
		});
		expect(root).not.toHaveAttribute("data-x-overflow");

		// Resized outside React, as a style change on an ancestor, so only the
		// scroll container's own resize can show it.
		root.style.width = "200px";

		await waitFor(() => {
			expect(root).toHaveAttribute("data-x-overflow", "");
		});
		expect(root).toHaveAttribute("data-sticky-active", "");
	});

	test("a cell edit that keeps the table's size does no layout read", async () => {
		// Why: a live table edits cells many times per second. Each edit that
		// leaves the table's size alone cannot change the overflow state, so it
		// must not force a layout.
		renderTable({ rootWidth: 200, tableWidth: 800 });
		const root = screen.getByTestId("root");
		await waitFor(() => {
			expect(root).toHaveAttribute("data-sticky-active", "");
		});
		const scrollWidth = vi.spyOn(Element.prototype, "scrollWidth", "get");

		screen.getByText("INV001").textContent = "INV002";
		// Two frames: the edit, then the frame a coalesced check would read in.
		await new Promise(requestAnimationFrame);
		await new Promise(requestAnimationFrame);

		expect(scrollWidth).not.toHaveBeenCalled();
	});

	test("a table that fits reports no overflow after the first read", async () => {
		const scrollWidth = vi.spyOn(Element.prototype, "scrollWidth", "get");
		renderTable({ rootWidth: 800, tableWidth: 200 });
		const root = screen.getByTestId("root");

		// The observer's first notification is the readiness signal; the
		// assertions below are about the values it produced.
		await waitFor(() => {
			// oxlint-disable-next-line mantle/no-bare-to-have-been-called -- Why: the same readiness signal as above.
			expect(scrollWidth).toHaveBeenCalled();
		});
		expect(root).not.toHaveAttribute("data-x-overflow");
		expect(root).not.toHaveAttribute("data-x-scroll-end");
		expect(root).not.toHaveAttribute("data-sticky-active");
	});
});
