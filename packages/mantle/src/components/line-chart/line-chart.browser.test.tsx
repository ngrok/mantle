"use client";

import { render, waitFor } from "@testing-library/react";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { LineChart } from "./line-chart.js";

/**
 * Real-browser geometry tests for the three series props whose entire effect is
 * canvas ink — `connectNulls`, `curve`, and `markers`. happy-dom's
 * `getContext("2d")` is null, so the renderer never runs there and unit tests
 * can only observe the tooltip's text; the path shape is only assertable
 * against real pixels.
 *
 * Chart tokens and the chart's structural layout are inlined instead of
 * importing the mantle stylesheet so the test stays hermetic (mirrors
 * bar-chart.browser.test.tsx).
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
	--background-color-popover: #ffffff;
	--border-color-popover: #d4d4d4;
}
.sr-only {
	position: absolute;
	width: 1px;
	height: 1px;
	overflow: hidden;
	clip: rect(0, 0, 0, 0);
}
[data-slot="line-chart"] {
	display: flex;
	flex-direction: column;
	width: 100%;
	height: 100%;
}
[data-slot="line-chart-plot"] {
	position: relative;
	flex: 1;
	min-height: 0;
	width: 100%;
}
[data-slot="line-chart-plot"] > canvas,
[data-slot="line-chart-plot"] > [tabindex] {
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;
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

const mustBeCanvas = (element: Element | null): HTMLCanvasElement => {
	if (element instanceof HTMLCanvasElement) {
		return element;
	}
	throw new Error("expected the chart canvas to render");
};

/** Per-device-column ink statistics for the series stroke. */
type ColumnInk = {
	/** How many pixels in the column carry the series color. */
	count: number;
	/** The stroke's vertical center in the column, `NaN` when the column is empty. */
	meanY: number;
};

/**
 * Scan the painted canvas column by column for chart-1 (#3e6ff4) ink. Reading
 * back through a second getContext("2d") returns the same live context the
 * engine paints with. Working in device columns keeps every assertion below
 * independent of devicePixelRatio and of the plot's axis padding.
 */
const scanInk = (canvas: HTMLCanvasElement): ColumnInk[] => {
	const context = canvas.getContext("2d");
	if (context == null || canvas.width === 0 || canvas.height === 0) {
		return [];
	}
	const image = context.getImageData(0, 0, canvas.width, canvas.height);
	const columns: ColumnInk[] = [];
	for (let x = 0; x < canvas.width; x++) {
		let count = 0;
		let sumY = 0;
		for (let y = 0; y < canvas.height; y++) {
			const offset = (y * canvas.width + x) * 4;
			const red = image.data[offset] ?? 0;
			const blue = image.data[offset + 2] ?? 0;
			const alpha = image.data[offset + 3] ?? 0;
			// chart-1 is blue-dominant; grid lines, axis text and the surface ring
			// around markers are all neutral, so they never match.
			if (alpha > 200 && blue > 200 && blue > red + 80) {
				count += 1;
				sumY += y;
			}
		}
		columns.push({ count, meanY: count === 0 ? Number.NaN : sumY / count });
	}
	return columns;
};

const totalInk = (columns: ColumnInk[]): number =>
	columns.reduce((sum, column) => sum + column.count, 0);

/** The first and last device columns carrying series ink. */
const inkSpan = (columns: ColumnInk[]): { first: number; last: number } => {
	let first = -1;
	let last = -1;
	for (let x = 0; x < columns.length; x++) {
		if ((columns[x]?.count ?? 0) > 0) {
			if (first < 0) {
				first = x;
			}
			last = x;
		}
	}
	return { first, last };
};

/**
 * The widest run of ink-free columns strictly inside the painted span — the
 * signature of a broken path. A continuous stroke leaves none.
 */
const widestInteriorGap = (columns: ColumnInk[]): number => {
	const { first, last } = inkSpan(columns);
	if (first < 0) {
		return 0;
	}
	let widest = 0;
	let run = 0;
	for (let x = first; x <= last; x++) {
		if ((columns[x]?.count ?? 0) === 0) {
			run += 1;
			widest = Math.max(widest, run);
		} else {
			run = 0;
		}
	}
	return widest;
};

/** The stroke's vertical center at a fraction across the painted span. */
const strokeYAt = (columns: ColumnInk[], fraction: number): number => {
	const { first, last } = inkSpan(columns);
	if (first < 0) {
		throw new Error("expected the series stroke to paint");
	}
	const x = Math.round(first + (last - first) * fraction);
	const meanY = columns[x]?.meanY ?? Number.NaN;
	if (Number.isNaN(meanY)) {
		throw new Error(`expected stroke ink at ${Math.round(fraction * 100)}% across the span`);
	}
	return meanY;
};

const gappy = [
	{ attempt: 0, latency: 120 },
	{ attempt: 1, latency: 132 },
	{ attempt: 2, latency: null },
	{ attempt: 3, latency: 140 },
	{ attempt: 4, latency: 150 },
];

const renderGappy = (connectNulls: boolean) =>
	render(
		<div style={{ width: 600, height: 300 }}>
			<LineChart.Root data={gappy} xKey="attempt" animate={false} aria-label="Latency">
				<LineChart.Line
					dataKey="latency"
					label="Latency"
					color="chart-1"
					connectNulls={connectNulls}
				/>
			</LineChart.Root>
		</div>,
	);

describe("LineChart connectNulls", () => {
	test("a mid-series null breaks the stroke by default", async () => {
		const { container } = renderGappy(false);
		const canvas = mustBeCanvas(container.querySelector("canvas"));
		await waitFor(() => {
			const columns = scanInk(canvas);
			expect(totalInk(columns)).toBeGreaterThan(200);
			// The null sits at the middle of five samples, so the missing segments
			// swallow roughly half the width.
			expect(widestInteriorGap(columns)).toBeGreaterThan(canvas.width * 0.2);
		});
	});

	test("connectNulls joins the stroke straight across the gap", async () => {
		const { container } = renderGappy(true);
		const canvas = mustBeCanvas(container.querySelector("canvas"));
		await waitFor(() => {
			const columns = scanInk(canvas);
			expect(totalInk(columns)).toBeGreaterThan(200);
			expect(widestInteriorGap(columns)).toBeLessThanOrEqual(1);
		});
	});
});

describe("LineChart curve", () => {
	const ramp = [
		{ attempt: 0, latency: 100 },
		{ attempt: 1, latency: 300 },
	];

	const renderRamp = (curve: "linear" | "step") =>
		render(
			<div style={{ width: 600, height: 300 }}>
				<LineChart.Root data={ramp} xKey="attempt" animate={false} aria-label="Latency">
					<LineChart.Line dataKey="latency" label="Latency" color="chart-1" curve={curve} />
				</LineChart.Root>
			</div>,
		);

	test("the default linear curve interpolates between samples", async () => {
		const { container } = renderRamp("linear");
		const canvas = mustBeCanvas(container.querySelector("canvas"));
		await waitFor(() => {
			expect(totalInk(scanInk(canvas))).toBeGreaterThan(100);
		});
		const columns = scanInk(canvas);
		// The value rises, so the stroke climbs (y shrinks) at every step across.
		expect(strokeYAt(columns, 0.2)).toBeGreaterThan(strokeYAt(columns, 0.4) + 5);
		expect(strokeYAt(columns, 0.4)).toBeGreaterThan(strokeYAt(columns, 0.6) + 5);
	});

	test("step holds each sample's value until the transition instead of interpolating", async () => {
		const { container } = renderRamp("step");
		const canvas = mustBeCanvas(container.querySelector("canvas"));
		await waitFor(() => {
			expect(totalInk(scanInk(canvas))).toBeGreaterThan(100);
		});
		const columns = scanInk(canvas);
		// Flat at the first sample's value, flat at the second's, and a real rise
		// between the two plateaus.
		expect(Math.abs(strokeYAt(columns, 0.2) - strokeYAt(columns, 0.4))).toBeLessThan(3);
		expect(Math.abs(strokeYAt(columns, 0.6) - strokeYAt(columns, 0.8))).toBeLessThan(3);
		expect(strokeYAt(columns, 0.2) - strokeYAt(columns, 0.8)).toBeGreaterThan(canvas.height * 0.3);
	});
});

describe("LineChart markers", () => {
	const samples = [
		{ attempt: 0, latency: 180 },
		{ attempt: 1, latency: 200 },
		{ attempt: 2, latency: 190 },
		{ attempt: 3, latency: 210 },
		{ attempt: 4, latency: 195 },
	];

	const renderSamples = (markers: boolean) =>
		render(
			<div style={{ width: 600, height: 300 }}>
				<LineChart.Root data={samples} xKey="attempt" animate={false} aria-label="Latency">
					<LineChart.Line dataKey="latency" label="Latency" color="chart-1" markers={markers} />
				</LineChart.Root>
			</div>,
		);

	test("markers thicken the stroke into dots at each sample", async () => {
		const plain = renderSamples(false);
		const dotted = renderSamples(true);
		const plainCanvas = mustBeCanvas(plain.container.querySelector("canvas"));
		const dottedCanvas = mustBeCanvas(dotted.container.querySelector("canvas"));
		const thickestColumn = (canvas: HTMLCanvasElement): number =>
			scanInk(canvas).reduce((thickest, column) => Math.max(thickest, column.count), 0);
		await waitFor(() => {
			expect(thickestColumn(plainCanvas)).toBeGreaterThan(0);
			// A marker dot's diameter dwarfs the stroke's thickness at its center.
			expect(thickestColumn(dottedCanvas)).toBeGreaterThan(thickestColumn(plainCanvas) * 1.5);
		});
	});
});
