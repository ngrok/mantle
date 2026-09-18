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
	// Poll the pitch itself: once the virtualizer measures the rows, it repositions them.
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

const gridRows = Array.from({ length: 40 }, (_, index) => ({
	id: `g-${index}`,
	name: `Grid row ${index}`,
}));

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
	// Wait for the reversed window to land: the row that renders "Grid row 0" now sits last.
	await waitFor(() => {
		expect(
			screen.getByRole("button", { name: "Grid row 0" }).closest("[data-index]"),
		).toHaveAttribute("data-index", "4");
	});

	// The same DOM node still renders "Grid row 0" — moved, not remounted...
	expect(screen.getByRole("button", { name: "Grid row 0" })).toBe(buttonBefore);
	// ...and its row now sits at the end of the reversed collection.
	expect(buttonBefore.closest("[data-index]")?.getAttribute("data-index")).toBe("4");
});

describe("List grid navigation", () => {
	test("clicking a windowed row's control makes it the active descendant and keeps focus on the collection without resetting the scroll position", async () => {
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
		const viewport = document.querySelector("[data-slot='list']");
		if (viewport == null) {
			throw new Error("viewport not found");
		}
		// Once the virtualizer measures the rows, the viewport turns scrollable.
		await expect.poll(() => viewport.scrollHeight).toBeGreaterThan(viewport.clientHeight);

		viewport.scrollTop = 150;
		// Wait for the scroll to land, or the hold assertion below is meaningless.
		await expect.poll(() => viewport.scrollTop).toBeGreaterThan(50);
		const scrollBefore = viewport.scrollTop;

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
		const grid = screen.getByRole("grid");
		const user = userEvent.setup();
		await user.click(button);
		// Focus must move to the collection (the single tab stop), not linger on
		// the clicked control; otherwise a later arrow press lights the control
		// with a `:focus-visible` ring.
		await waitFor(() => expect(grid).toHaveFocus());

		// The scroll must stay put (the bug snapped it back to the top)...
		expect(Math.abs(viewport.scrollTop - scrollBefore)).toBeLessThan(20);
		// ...and the clicked row — not row 0 — becomes the active descendant.
		expect(grid.getAttribute("aria-activedescendant")).toBe(
			grid.querySelector(`[data-index='${clickedIndex}']`)?.id,
		);

		// Arrowing after the click keeps focus on the collection (never a ring on
		// the previously-clicked control).
		await user.keyboard("{ArrowUp}");
		expect(grid).toHaveFocus();
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
		const grid = await screen.findByRole("grid");
		const activeIndex = () =>
			document
				.querySelector("[data-slot='list'] [role='row'][data-active]")
				?.getAttribute("data-index") ?? null;

		const user = userEvent.setup();
		grid.focus(); // activates the first enabled row (0)
		await waitFor(() => expect(activeIndex()).toBe("0"));
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

	test("windowed listitem rows carry aria-posinset/aria-setsize and no grid attributes", () => {
		// Why no grid attributes: WAI-ARIA 1.2 reserves `aria-rowindex` and
		// `aria-rowcount` for grids. Listitem rows carry `aria-posinset` and `aria-setsize` instead.
		render(
			<ListVirtualRoot semantics="list" aria-label="windowed list" style={{ maxHeight: 200 }}>
				{gridRows.map((row) => (
					<ListItem key={row.id}>
						<button type="button">{row.name}</button>
					</ListItem>
				))}
			</ListVirtualRoot>,
		);

		const firstListItem = document.querySelector("[role='listitem'][data-index='0']");
		expect(firstListItem).toHaveAttribute("aria-posinset", "1");
		expect(firstListItem).toHaveAttribute("aria-setsize", String(gridRows.length));
		expect(firstListItem).not.toHaveAttribute("aria-rowindex");
		expect(document.querySelector("[role='list']")).not.toHaveAttribute("aria-rowcount");
	});

	test("windowed grid rows carry aria-rowindex under aria-rowcount and no listitem attributes", () => {
		// Why no listitem attributes: WAI-ARIA 1.2 forbids `aria-posinset` and `aria-setsize`
		// on grid rows. The collection carries `aria-rowcount` instead.
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
		const grid = await screen.findByRole("grid");
		const viewport = document.querySelector("[data-slot='list']");
		if (viewport == null) {
			throw new Error("viewport not found");
		}

		grid.focus(); // activates row 0
		await waitFor(() => expect(grid).toHaveAttribute("aria-activedescendant"));
		// Pin the query before asserting its absence below.
		expect(document.querySelector("[role='row'][data-index='0']")).toBeInTheDocument();

		// Mouse-scroll to the bottom: row 0 leaves the mounted window (+ overscan).
		viewport.scrollTop = viewport.scrollHeight;
		await waitFor(() =>
			expect(document.querySelector("[role='row'][data-index='0']")).not.toBeInTheDocument(),
		);
		expect(grid).not.toHaveAttribute("aria-activedescendant");

		// Keyboard nav scrolls the (new) active row back into view and restores the reference.
		const user = userEvent.setup();
		await user.keyboard("{ArrowDown}");
		await waitFor(() => expect(grid).toHaveAttribute("aria-activedescendant"));
	});
});
