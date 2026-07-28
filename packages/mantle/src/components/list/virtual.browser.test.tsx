"use client";

import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { Item as ListItem, Root as ListRoot } from "./primitive.js";
import { VirtualRoot as ListVirtualRoot } from "./virtual.js";

const rows = Array.from({ length: 8 }, (_, index) => ({
	id: `row-${index}`,
	name: `Item ${index}`,
	sub: `sub ${index}`,
}));

function Item({ row }: { row: (typeof rows)[number] }) {
	return (
		<ListItem key={row.id}>
			<button type="button" className="flex w-full flex-col gap-0.5 px-2 py-1.5 text-left text-sm">
				<span className="font-medium">{row.name}</span>
				<span className="leading-4">{row.sub}</span>
			</button>
		</ListItem>
	);
}

// The browser test DOM has no compiled Tailwind, so the utility classes the
// primitive relies on for row geometry are inert by default (the abs-position
// placement is inline, so *that* applies — the inset padding and the
// positioning context are the classes we must shim). Define exactly those
// utilities so the component's *own* class placement (`p-1` on the viewport,
// no horizontal padding on the collection) drives the measured layout — a
// regression that moved the inset back onto the collection would fail here.
const UTILITY_SHIM = `
	* { box-sizing: border-box; }
	.p-1 { padding: 0.25rem; }
	.px-1 { padding-left: 0.25rem; padding-right: 0.25rem; }
	.py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
	.relative { position: relative; }
	.w-full { width: 100%; }
	.flex { display: flex; }
	.flex-col { flex-direction: column; }
	.gap-px { gap: 1px; }
	.overflow-y-auto { overflow-y: auto; }
`;

let shimStyle: HTMLStyleElement;
beforeAll(() => {
	shimStyle = document.createElement("style");
	shimStyle.textContent = UTILITY_SHIM;
	document.head.appendChild(shimStyle);
});
afterAll(() => {
	shimStyle.remove();
});

/** Every windowed row currently mounted (each `Item` stamps `data-index`). */
function mountedRowCount(): number {
	return document.querySelectorAll("[data-slot='list'] [data-index]").length;
}

/**
 * Resolve once the virtualizer has measured its scroll viewport and committed a
 * first window — react-virtual renders no rows until the viewport has a size, so
 * this replaces guessing at how long that takes.
 */
async function windowMounted(): Promise<void> {
	await waitFor(() => {
		expect(mountedRowCount()).toBeGreaterThan(0);
	});
}

/** The rendered height of the collection element — the virtualizer's total scroll size. */
function collectionHeight(): number {
	const collection = document.querySelector("[data-slot='list-collection']");
	if (!(collection instanceof HTMLElement)) {
		throw new Error("collection not found");
	}
	return collection.getBoundingClientRect().height;
}

/**
 * Geometry of the first two rendered rows relative to their scroll viewport:
 * the row pitch (top-to-top) and the left/right inset of a row within the
 * viewport. `[data-slot="list"]` is the viewport; `[role="listitem"]` are rows.
 */
async function firstRowGeometry(): Promise<{
	pitch: number;
	leftInset: number;
	rightInset: number;
}> {
	const items = await screen.findAllByRole("listitem");
	const first = items[0];
	const second = items[1];
	if (first == null || second == null) {
		throw new Error("expected at least two rows");
	}
	const viewport = first.closest("[data-slot='list']");
	if (viewport == null) {
		throw new Error("row is not inside a list viewport");
	}
	const viewportRect = viewport.getBoundingClientRect();
	const firstRect = first.getBoundingClientRect();
	const secondRect = second.getBoundingClientRect();
	return {
		pitch: secondRect.top - firstRect.top,
		leftInset: firstRect.left - viewportRect.left,
		rightInset: viewportRect.right - firstRect.right,
	};
}

describe("List virtualization spacing", () => {
	test("windowed rows match non-virtualized rows in pitch and border inset", async () => {
		const plain = render(
			<ListRoot semantics="list" aria-label="plain" className="max-h-60">
				{rows.map((row) => (
					<Item key={row.id} row={row} />
				))}
			</ListRoot>,
		);
		const plainGeometry = await firstRowGeometry();
		plain.unmount();

		const virtual = render(
			<ListVirtualRoot semantics="list" aria-label="virtual" className="max-h-60">
				{rows.map((row) => (
					<Item key={row.id} row={row} />
				))}
			</ListVirtualRoot>,
		);
		// Until the virtualizer's ResizeObserver measurement lands, rows are placed
		// at the seeded `estimateItemHeight` pitch — wait for the measured pitch
		// instead of assuming how many frames that takes.
		await expect
			.poll(async () => (await firstRowGeometry()).pitch)
			.toBeCloseTo(plainGeometry.pitch, 0);
		const virtualGeometry = await firstRowGeometry();
		virtual.unmount();

		// The windowed list must not add vertical spacing between rows...
		expect(virtualGeometry.pitch).toBeCloseTo(plainGeometry.pitch, 0);
		// ...nor let its absolutely-positioned rows lose the horizontal inset that
		// keeps each pill clear of the viewport border (the bug this guards).
		expect(virtualGeometry.leftInset).toBeCloseTo(plainGeometry.leftInset, 0);
		expect(virtualGeometry.rightInset).toBeCloseTo(plainGeometry.rightInset, 0);
		expect(virtualGeometry.leftInset).toBeGreaterThan(0);
	});
});

const gridRows = Array.from({ length: 40 }, (_, index) => ({
	id: `g-${index}`,
	name: `Grid row ${index}`,
}));

describe("List virtualization windowing knobs", () => {
	test("estimateItemHeight sizes the rows the virtualizer has not measured", async () => {
		// Rows are ~37px tall here, so a 200px seed is unmistakably the estimate at
		// work rather than a measured size.
		const estimateItemHeight = 200;
		render(
			<ListVirtualRoot
				semantics="list"
				aria-label="seeded"
				style={{ maxHeight: 200 }}
				estimateItemHeight={estimateItemHeight}
			>
				{gridRows.map((row) => (
					<ListItem key={row.id}>
						<button type="button">{row.name}</button>
					</ListItem>
				))}
			</ListVirtualRoot>,
		);
		await windowMounted();

		// Only the window (plus overscan) is ever measured; the rest of the
		// collection is sized by the seed, which is what gives the scrollbar its
		// range. The assertion is a lower bound, so it holds whether or not
		// measurement has landed — but it fails outright if the seed is ignored.
		const mounted = mountedRowCount();
		expect(mounted).toBeLessThan(gridRows.length / 2);
		expect(collectionHeight()).toBeGreaterThanOrEqual(
			estimateItemHeight * (gridRows.length - mounted),
		);
	});

	test("overscan controls how many rows stay mounted beyond the visible window", async () => {
		function Windowed({ overscan }: { overscan: number }) {
			return (
				<ListVirtualRoot
					semantics="list"
					aria-label="overscan"
					style={{ maxHeight: 200 }}
					overscan={overscan}
				>
					{gridRows.map((row) => (
						<ListItem key={row.id}>
							<button type="button">{row.name}</button>
						</ListItem>
					))}
				</ListVirtualRoot>
			);
		}

		const tight = render(<Windowed overscan={0} />);
		await windowMounted();
		const tightCount = mountedRowCount();
		// A no-buffer window mounts only what fits the 200px viewport, well short of
		// the full collection — otherwise the comparison below proves nothing.
		expect(tightCount).toBeLessThan(gridRows.length / 2);
		tight.unmount();

		render(<Windowed overscan={20} />);
		// The buffer is what keeps a grid's active row mounted for
		// `aria-activedescendant`, so it has to actually reach the virtualizer —
		// dropping the prop (library default 1) leaves the two counts a row apart.
		await expect.poll(mountedRowCount).toBeGreaterThan(tightCount + 10);
	});
});

describe("List virtualization row identity", () => {
	test("row identity follows consumer keys across a reorder, matching the plain Root", async () => {
		// Regression: windowed rows used to be keyed by the virtualizer's default
		// key (the index), so a reorder remounted every moved row — losing its DOM
		// node and any state inside it — instead of following the consumer's `key`s
		// the way the non-virtualized `Root` does.
		const keyedRows = gridRows.slice(0, 5);
		function KeyedList({ order }: { order: typeof keyedRows }) {
			return (
				<ListVirtualRoot semantics="list" aria-label="keyed" style={{ maxHeight: 400 }}>
					{order.map((row) => (
						<ListItem key={row.id}>
							<button type="button">{row.name}</button>
						</ListItem>
					))}
				</ListVirtualRoot>
			);
		}
		const { rerender } = render(<KeyedList order={keyedRows} />);
		const buttonBefore = await screen.findByRole("button", { name: "Grid row 0" });

		rerender(<KeyedList order={keyedRows.toReversed()} />);
		// Wait for the reversed order to commit: the first row now sits last.
		await waitFor(() => {
			expect(
				screen.getByRole("button", { name: "Grid row 0" }).closest("[data-index]"),
			).toHaveAttribute("data-index", "4");
		});

		// The same DOM node still renders "Grid row 0" — moved, not remounted.
		expect(screen.getByRole("button", { name: "Grid row 0" })).toBe(buttonBefore);
	});
});

describe("List grid navigation", () => {
	test("clicking a windowed row selects it without resetting the scroll position", async () => {
		render(
			<ListVirtualRoot
				semantics="grid"
				aria-label="grid"
				style={{ maxHeight: 200 }}
				onActivate={() => {}}
			>
				{gridRows.map((row) => (
					<ListItem key={row.id}>
						<div role="gridcell">
							{/* tabIndex -1 mirrors SelectableList's checkbox: focusable by click, not Tab. */}
							<button type="button" tabIndex={-1}>
								{row.name}
							</button>
						</div>
					</ListItem>
				))}
			</ListVirtualRoot>,
		);
		// The viewport is only scrollable once the virtualizer has measured it and
		// sized the collection.
		await windowMounted();

		const viewport = document.querySelector("[data-slot='list']");
		if (viewport == null) {
			throw new Error("viewport not found");
		}
		viewport.scrollTop = 150;
		const scrollBefore = viewport.scrollTop;
		// Sanity: the list actually scrolled, otherwise the assertion is meaningless.
		expect(scrollBefore).toBeGreaterThan(50);

		// Click a row that is currently within the visible window.
		const viewportRect = viewport.getBoundingClientRect();
		const button = Array.from(viewport.querySelectorAll("button")).find((candidate) => {
			const rect = candidate.getBoundingClientRect();
			return rect.top >= viewportRect.top && rect.bottom <= viewportRect.bottom;
		});
		if (button == null) {
			throw new Error("no fully-visible row button found");
		}
		const clickedIndex = button.closest("[data-index]")?.getAttribute("data-index");
		const grid = viewport.querySelector("[role='grid']");
		const user = userEvent.setup();
		await user.click(button);

		// Focus must move to the collection (the single tab stop), not linger on the
		// clicked control — otherwise a later arrow press lights the control with a
		// `:focus-visible` ring.
		await waitFor(() => {
			expect(document.activeElement).toBe(grid);
		});
		// The scroll must stay put (the bug snapped it back to the top)...
		expect(Math.abs(viewport.scrollTop - scrollBefore)).toBeLessThan(20);
		// ...and the clicked row — not row 0 — becomes the active descendant.
		expect(grid?.getAttribute("aria-activedescendant")).toBe(
			grid?.querySelector(`[data-index='${clickedIndex}']`)?.id,
		);

		// Arrowing after the click keeps focus on the collection (never a ring on
		// the previously-clicked control).
		await user.keyboard("{ArrowUp}");
		expect(document.activeElement).toBe(grid);
	});

	test("a genuinely tabbable control inside a grid row keeps focus (no keyboard trap)", async () => {
		render(
			<ListVirtualRoot
				semantics="grid"
				aria-label="grid"
				style={{ maxHeight: 200 }}
				onActivate={() => {}}
			>
				{gridRows.slice(0, 5).map((row) => (
					<ListItem key={row.id}>
						<div role="gridcell">
							{/* A naturally-tabbable control (default tabIndex 0), as the docs permit. */}
							<a href="/x">{row.name}</a>
						</div>
					</ListItem>
				))}
			</ListVirtualRoot>,
		);

		const link = await screen.findByRole("link", { name: "Grid row 0" });
		// Focusing a tabbable in-row control must NOT bounce focus back to the grid —
		// otherwise the control is keyboard-unreachable and forward-Tab is trapped.
		// (The row's own tabIndex=-1 controls are still reclaimed; see the click test.)
		link.focus();
		expect(link).toHaveFocus();
		// The pull-back would run from the grid's focus handler, so give React a
		// commit before trusting that focus stayed.
		await waitFor(() => {
			expect(document.querySelector("[role='grid']")).toHaveAttribute("aria-activedescendant");
		});
		expect(link).toHaveFocus();
	});

	test("keyboard navigation skips rows whose `disabled` prop is set", async () => {
		// Index 2 is disabled — arrowing should step over it, reading the flag from
		// the row element's `disabled` prop (not the DOM), so it works windowed too.
		render(
			<ListVirtualRoot
				semantics="grid"
				aria-label="grid"
				style={{ maxHeight: 400 }}
				onActivate={() => {}}
			>
				{gridRows.slice(0, 6).map((row, index) => (
					<ListItem key={row.id} disabled={index === 2}>
						<div role="gridcell">
							<button type="button" tabIndex={-1}>
								{row.name}
							</button>
						</div>
					</ListItem>
				))}
			</ListVirtualRoot>,
		);
		await windowMounted();

		const grid = document.querySelector<HTMLElement>("[data-slot='list'] [role='grid']");
		if (grid == null) {
			throw new Error("grid not found");
		}
		const activeIndex = () =>
			document
				.querySelector("[data-slot='list'] [role='row'][data-active]")
				?.getAttribute("data-index") ?? null;

		const user = userEvent.setup();
		grid.focus(); // activates the first enabled row (0)
		await waitFor(() => {
			expect(activeIndex()).toBe("0");
		});
		const sequence = [activeIndex()];
		for (let step = 0; step < 4; step++) {
			await user.keyboard("{ArrowDown}");
			sequence.push(activeIndex());
		}

		// 0 → 1 → (skip disabled 2) → 3 → 4 → 5, never landing on 2.
		expect(sequence).toEqual(["0", "1", "3", "4", "5"]);
		expect(
			document
				.querySelector("[data-slot='list'] [role='row'][data-index='2']")
				?.hasAttribute("data-active"),
		).toBe(false);
	});

	test("windowed rows expose the ARIA attributes their semantics allow", async () => {
		// listitem rows: aria-posinset/aria-setsize. Grid rows: aria-rowindex with
		// aria-rowcount on the collection (posinset/setsize are invalid on grid rows
		// per WAI-ARIA 1.2).
		const listRender = render(
			<ListVirtualRoot semantics="list" aria-label="windowed list" style={{ maxHeight: 200 }}>
				{gridRows.map((row) => (
					<ListItem key={row.id}>
						<button type="button">{row.name}</button>
					</ListItem>
				))}
			</ListVirtualRoot>,
		);
		await windowMounted();

		const firstListItem = document.querySelector("[role='listitem'][data-index='0']");
		expect(firstListItem).toHaveAttribute("aria-posinset", "1");
		expect(firstListItem).toHaveAttribute("aria-setsize", String(gridRows.length));
		expect(firstListItem).not.toHaveAttribute("aria-rowindex");
		expect(document.querySelector("[role='list']")).not.toHaveAttribute("aria-rowcount");
		listRender.unmount();

		render(
			<ListVirtualRoot
				semantics="grid"
				aria-label="windowed grid"
				style={{ maxHeight: 200 }}
				onActivate={() => {}}
			>
				{gridRows.map((row) => (
					<ListItem key={row.id}>
						<div role="gridcell">{row.name}</div>
					</ListItem>
				))}
			</ListVirtualRoot>,
		);
		await windowMounted();

		const grid = document.querySelector("[role='grid']");
		expect(grid).toHaveAttribute("aria-rowcount", String(gridRows.length));
		const firstGridRow = document.querySelector("[role='row'][data-index='0']");
		expect(firstGridRow).toHaveAttribute("aria-rowindex", "1");
		expect(firstGridRow).not.toHaveAttribute("aria-posinset");
		expect(firstGridRow).not.toHaveAttribute("aria-setsize");
	});

	test("scrolling the active row out of the window drops aria-activedescendant until keyboard nav restores it", async () => {
		// `aria-activedescendant` must reference an element in the DOM; once the
		// active row unmounts (mouse scroll far away), the reference is dropped
		// rather than left dangling, and the next arrow key restores it.
		render(
			<ListVirtualRoot
				semantics="grid"
				aria-label="grid"
				style={{ maxHeight: 200 }}
				onActivate={() => {}}
			>
				{gridRows.map((row) => (
					<ListItem key={row.id}>
						<div role="gridcell">{row.name}</div>
					</ListItem>
				))}
			</ListVirtualRoot>,
		);
		await windowMounted();

		const grid = document.querySelector<HTMLElement>("[role='grid']");
		const viewport = document.querySelector("[data-slot='list']");
		if (grid == null || viewport == null) {
			throw new Error("grid or viewport not found");
		}

		grid.focus(); // activates row 0
		await waitFor(() => {
			expect(grid).toHaveAttribute("aria-activedescendant");
		});

		// Mouse-scroll to the bottom: row 0 leaves the mounted window (+ overscan).
		viewport.scrollTop = viewport.scrollHeight;
		await waitFor(() => {
			expect(document.querySelector("[role='row'][data-index='0']")).not.toBeInTheDocument();
		});
		expect(grid).not.toHaveAttribute("aria-activedescendant");

		// Keyboard nav scrolls the (new) active row back into view and restores the reference.
		const user = userEvent.setup();
		await user.keyboard("{ArrowDown}");
		await waitFor(() => {
			expect(grid).toHaveAttribute("aria-activedescendant");
		});
	});
});
