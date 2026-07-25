"use client";

import { render, waitFor } from "@testing-library/react";
import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import type { MockInstance } from "vitest";
import { BarChart } from "../bar-chart/index.js";

/**
 * Real-browser geometry tests for `BarChart` `orientation="horizontal"`: bars
 * grow rightward from a left baseline with categories banded down the y axis.
 * happy-dom can't provide the real plot layout the engine projects onto, so
 * these sample the painted canvas directly.
 */
const STYLE = `
:root {
	--color-chart-1: #3e6ff4;
	--color-chart-other: #737373;
	--border-color-card-muted: #e5e5e5;
	--border-color-card: #d4d4d4;
	--text-color-muted: #717171;
	--color-neutral-500: #737373;
	--background-color-card: #ffffff;
}
.sr-only {
	position: absolute;
	width: 1px;
	height: 1px;
	overflow: hidden;
	clip: rect(0, 0, 0, 0);
}
/* Browser tests load no Tailwind build; mirror the chart's structural layout so
   the plot geometry is realistic. */
[data-slot="bar-chart"] {
	position: relative;
	display: flex;
	flex-direction: column;
	width: 100%;
	height: 100%;
}
[data-slot$="-plot"] {
	position: relative;
	flex: 1;
	min-height: 0;
	width: 100%;
}
[data-slot$="-plot"] > canvas,
[data-slot$="-plot"] > [tabindex] {
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;
}
`;

let styleElement: HTMLStyleElement;
let fillTextSpy: MockInstance;

beforeAll(() => {
	styleElement = document.createElement("style");
	styleElement.textContent = STYLE;
	document.head.appendChild(styleElement);
});

// Installed per test rather than once, because `restoreMocks` tears every spy down between tests.
// Calls through to the real implementation, so painting is unchanged — the spy only records where
// each tick label landed.
beforeEach(() => {
	fillTextSpy = vi.spyOn(CanvasRenderingContext2D.prototype, "fillText");
});

afterAll(() => {
	styleElement.remove();
});

/**
 * A pixel is a series-fill pixel when it is the blue-dominant chart-1 color
 * (`rgb(62, 111, 244)`) — distinct from the grey axis text/grid and the
 * transparent ground, so ink counts ignore chrome.
 */
const isSeriesInk = (data: Uint8ClampedArray, offset: number): boolean => {
	const red = data[offset] ?? 0;
	const blue = data[offset + 2] ?? 0;
	const alpha = data[offset + 3] ?? 0;
	return alpha > 0 && blue > 200 && red < 150;
};

type InkScan = {
	topInk: number;
	bottomInk: number;
	leftInk: number;
	rightInk: number;
	leftmost: number;
	rightmost: number;
};

/** Count series-ink pixels split at both midlines, plus the x extent. */
const scanInk = (canvas: HTMLCanvasElement): InkScan => {
	const context = canvas.getContext("2d");
	if (context == null) {
		throw new Error("no 2d context");
	}
	const { width, height } = canvas;
	const { data } = context.getImageData(0, 0, width, height);
	const scan: InkScan = {
		topInk: 0,
		bottomInk: 0,
		leftInk: 0,
		rightInk: 0,
		leftmost: width,
		rightmost: 0,
	};
	for (let y = 0; y < height; y += 1) {
		for (let x = 0; x < width; x += 1) {
			if (!isSeriesInk(data, (y * width + x) * 4)) {
				continue;
			}
			if (y < height / 2) {
				scan.topInk += 1;
			} else {
				scan.bottomInk += 1;
			}
			if (x < width / 2) {
				scan.leftInk += 1;
			} else {
				scan.rightInk += 1;
			}
			scan.leftmost = Math.min(scan.leftmost, x);
			scan.rightmost = Math.max(scan.rightmost, x);
		}
	}
	return scan;
};

const twoCategories = [
	{ cat: "A", v: 10 },
	{ cat: "B", v: 90 },
];

/**
 * Where each distinct tick label was last painted, in canvas coordinates.
 * Axis labels are canvas ink, so their side of the plot is only observable
 * through the paint call — and the label-side swap is exactly what
 * `orientation` has to get right.
 */
const labelPositions = (): Map<string, { x: number; y: number }> => {
	const positions = new Map<string, { x: number; y: number }>();
	for (const call of fillTextSpy.mock.calls) {
		positions.set(String(call[0]), { x: Number(call[1]), y: Number(call[2]) });
	}
	return positions;
};

/** The painted positions of the two category names, failing loudly if either is missing. */
const categoryPositions = (positions: Map<string, { x: number; y: number }>) => {
	const a = positions.get("A");
	const b = positions.get("B");
	if (a == null || b == null) {
		throw new Error(`expected both category labels to paint, got ${[...positions.keys()]}`);
	}
	return [a, b];
};

/** The painted positions of the numeric value ticks. */
const valuePositions = (positions: Map<string, { x: number; y: number }>) =>
	[...positions.entries()].filter(([text]) => /^\d+$/.test(text)).map(([, position]) => position);

const canvasOf = (container: HTMLElement): HTMLCanvasElement => {
	const canvas = container.querySelector("canvas");
	if (!(canvas instanceof HTMLCanvasElement)) {
		throw new Error("expected the chart canvas to render");
	}
	return canvas;
};

describe("bar orientation", () => {
	test("defaults to vertical: bars stand up from the bottom baseline", async () => {
		// No `orientation` prop. Vertical bars band categories along x (A left, B
		// right) and grow value up y from the bottom, so the tall B bar puts far
		// more ink on the right, and every bar's ink hugs the bottom.
		const { container } = render(
			<div style={{ width: 600, height: 300 }}>
				<BarChart.Root data={twoCategories} xKey="cat" animate={false} aria-label="Default bars">
					<BarChart.XAxis />
					<BarChart.YAxis />
					<BarChart.Bar dataKey="v" label="Value" color="chart-1" />
				</BarChart.Root>
			</div>,
		);
		const canvas = canvasOf(container);
		await waitFor(() => {
			expect(canvas.width).toBeGreaterThan(0);
			const scan = scanInk(canvas);
			// Categories run along x: the tall B bar sits on the right.
			expect(scan.leftInk).toBeGreaterThan(0);
			expect(scan.rightInk).toBeGreaterThan(scan.leftInk * 2);
			// Bars grow up from the bottom baseline, so ink is bottom-heavy.
			expect(scan.bottomInk).toBeGreaterThan(scan.topInk);
		});
	});

	test("horizontal: bars grow rightward with categories banded down the y axis", async () => {
		// Category "A" (index 0, small value) bands to the top; "B" (index 1, large
		// value) to the bottom. Horizontal bars map value onto x, so the bottom row
		// carries far more ink and reaches further right than the top row.
		const { container } = render(
			<div style={{ width: 600, height: 300 }}>
				<BarChart.Root
					data={twoCategories}
					xKey="cat"
					orientation="horizontal"
					animate={false}
					aria-label="Horizontal bars"
				>
					<BarChart.XAxis />
					<BarChart.YAxis />
					<BarChart.Bar dataKey="v" label="Value" color="chart-1" />
				</BarChart.Root>
			</div>,
		);
		const canvas = canvasOf(container);
		await waitFor(() => {
			expect(canvas.width).toBeGreaterThan(0);
			const scan = scanInk(canvas);
			// Categories run down y: the large-value bottom row dominates.
			expect(scan.topInk).toBeGreaterThan(0);
			expect(scan.bottomInk).toBeGreaterThan(scan.topInk * 2);
			// Bars begin at the shared left baseline and the 90-value bar reaches
			// well past the plot's horizontal midpoint.
			expect(scan.leftmost).toBeLessThan(canvas.width / 2);
			expect(scan.rightmost).toBeGreaterThan(canvas.width * 0.7);
		});
	});

	test("vertical: category names sit under the plot, value numbers in the left gutter", async () => {
		const { container } = render(
			<div style={{ width: 600, height: 300 }}>
				<BarChart.Root data={twoCategories} xKey="cat" animate={false} aria-label="Default bars">
					<BarChart.XAxis />
					<BarChart.YAxis />
					<BarChart.Bar dataKey="v" label="Value" color="chart-1" />
				</BarChart.Root>
			</div>,
		);
		const canvas = canvasOf(container);
		await waitFor(() => {
			expect(canvas.width).toBeGreaterThan(0);
			const positions = labelPositions();
			const categories = categoryPositions(positions);
			const values = valuePositions(positions);
			expect(values.length).toBeGreaterThan(1);
			// Category labels share one baseline below the plot; value labels share
			// one right-aligned x in the gutter left of it.
			expect(Math.abs((categories[0]?.y ?? 0) - (categories[1]?.y ?? 0))).toBeLessThan(1);
			expect(new Set(values.map((value) => Math.round(value.x))).size).toBe(1);
			// Category strip below every value label; value gutter left of every category.
			expect(Math.min(...categories.map((category) => category.y))).toBeGreaterThan(
				Math.max(...values.map((value) => value.y)),
			);
			expect(Math.max(...values.map((value) => value.x))).toBeLessThan(
				Math.min(...categories.map((category) => category.x)),
			);
		});
	});

	test("horizontal: the axis labels swap sides with the bars", async () => {
		// The mirror of the vertical case: categories move into the left gutter and
		// the value numbers run along the bottom. Inverting the swap paints category
		// names at x-coordinates that are really band-center y values — completely
		// mislabeled axes that the ink-geometry assertions above cannot see.
		const { container } = render(
			<div style={{ width: 600, height: 300 }}>
				<BarChart.Root
					data={twoCategories}
					xKey="cat"
					orientation="horizontal"
					animate={false}
					aria-label="Horizontal bars"
				>
					<BarChart.XAxis />
					<BarChart.YAxis />
					<BarChart.Bar dataKey="v" label="Value" color="chart-1" />
				</BarChart.Root>
			</div>,
		);
		const canvas = canvasOf(container);
		await waitFor(() => {
			expect(canvas.width).toBeGreaterThan(0);
			const positions = labelPositions();
			const categories = categoryPositions(positions);
			const values = valuePositions(positions);
			expect(values.length).toBeGreaterThan(1);
			// Categories now share the gutter's right-aligned x, one band-center per row.
			expect(new Set(categories.map((category) => Math.round(category.x))).size).toBe(1);
			expect(Math.abs((categories[0]?.y ?? 0) - (categories[1]?.y ?? 0))).toBeGreaterThan(1);
			// Value numbers now share the bottom strip's baseline.
			expect(new Set(values.map((value) => Math.round(value.y))).size).toBe(1);
			expect(Math.min(...values.map((value) => value.y))).toBeGreaterThan(
				Math.max(...categories.map((category) => category.y)),
			);
			expect(Math.max(...categories.map((category) => category.x))).toBeLessThan(
				Math.min(...values.map((value) => value.x)),
			);
		});
	});
});
