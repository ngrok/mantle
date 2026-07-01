"use client";

import { render, screen } from "@testing-library/react";
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
