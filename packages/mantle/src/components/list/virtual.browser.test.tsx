"use client";

import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { List } from "./list.js";

const rows = Array.from({ length: 8 }, (_, index) => ({
	id: `row-${index}`,
	name: `Row ${index}`,
	sub: `sub ${index}`,
}));

function Row({ row }: { row: (typeof rows)[number] }) {
	return (
		<List.Row key={row.id}>
			<button type="button" className="flex w-full flex-col gap-0.5 px-2 py-1.5 text-left text-sm">
				<span className="font-medium">{row.name}</span>
				<span className="leading-4">{row.sub}</span>
			</button>
		</List.Row>
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

describe("List virtualization spacing", () => {
	test("windowed rows match non-virtualized rows in pitch and border inset", async () => {
		const plain = render(
			<List.Root semantics="list" aria-label="plain" className="max-h-60">
				{rows.map((row) => (
					<Row key={row.id} row={row} />
				))}
			</List.Root>,
		);
		await new Promise((resolve) => {
			requestAnimationFrame(() => resolve(null));
		});
		const plainGeometry = await firstRowGeometry();
		plain.unmount();

		const virtual = render(
			<List.VirtualRoot semantics="list" aria-label="virtual" className="max-h-60">
				{rows.map((row) => (
					<Row key={row.id} row={row} />
				))}
			</List.VirtualRoot>,
		);
		// Give the virtualizer time to measure and reposition.
		await new Promise((resolve) => {
			setTimeout(resolve, 100);
		});
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

describe("List grid navigation", () => {
	test("clicking a windowed row selects it without resetting the scroll position", async () => {
		render(
			<List.VirtualRoot
				semantics="grid"
				aria-label="grid"
				style={{ maxHeight: 200 }}
				onActivate={() => {}}
			>
				{gridRows.map((row) => (
					<List.Row key={row.id}>
						<div role="gridcell">
							{/* tabIndex -1 mirrors SelectableList's checkbox: focusable by click, not Tab. */}
							<button type="button" tabIndex={-1}>
								{row.name}
							</button>
						</div>
					</List.Row>
				))}
			</List.VirtualRoot>,
		);
		// Let the virtualizer measure so the viewport is scrollable.
		await new Promise((resolve) => {
			setTimeout(resolve, 100);
		});

		const viewport = document.querySelector("[data-slot='list']");
		if (viewport == null) {
			throw new Error("viewport not found");
		}
		viewport.scrollTop = 150;
		await new Promise((resolve) => {
			requestAnimationFrame(() => resolve(null));
		});
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
		const user = userEvent.setup();
		await user.click(button);
		await new Promise((resolve) => {
			setTimeout(resolve, 100);
		});

		// The scroll must stay put (the bug snapped it back to the top)...
		expect(Math.abs(viewport.scrollTop - scrollBefore)).toBeLessThan(20);

		const grid = viewport.querySelector("[role='grid']");
		// ...focus must move to the collection (the single tab stop), not linger on
		// the clicked control — otherwise a later arrow press lights the control
		// with a `:focus-visible` ring...
		expect(document.activeElement).toBe(grid);
		// ...and the clicked row — not row 0 — becomes the active descendant.
		expect(grid?.getAttribute("aria-activedescendant")).toBe(
			grid?.querySelector(`[data-index='${clickedIndex}']`)?.id,
		);

		// Arrowing after the click keeps focus on the collection (never a ring on
		// the previously-clicked control).
		await user.keyboard("{ArrowUp}");
		expect(document.activeElement).toBe(grid);
	});
});
