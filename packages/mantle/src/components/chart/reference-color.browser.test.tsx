"use client";

import { render, waitFor } from "@testing-library/react";
import { findChartCanvas } from "../../test-utils/find-chart-canvas.js";
import { afterAll, beforeAll, expect, test, vi } from "vitest";
import * as LineChart from "../line-chart/line-chart-parts.js";
import { CanvasLineChartRoot } from "../../test-utils/canvas-chart-roots.js";

/**
 * Real-browser test of the engine's one style read per color pass: a custom
 * reference-line color resolves through the pass's own resolver, not through
 * a `getComputedStyle` read of its own. happy-dom has no 2D context, so no
 * paint reaches a reference line there.
 */
const STYLE = `
:root {
	--color-chart-blue: #3e6ff4;
	--color-chart-neutral: #737373;
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
   the plot has a size and the chart paints. */
[data-slot="line-chart"] {
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

beforeAll(() => {
	styleElement = document.createElement("style");
	styleElement.textContent = STYLE;
	document.head.appendChild(styleElement);
});

afterAll(() => {
	styleElement.remove();
});

/** The opaque pixels on `canvas` within 2 of `target` in each channel. */
const countPixels = (
	canvas: HTMLCanvasElement,
	target: { red: number; green: number; blue: number },
): number => {
	const context = canvas.getContext("2d");
	if (context == null) {
		throw new Error("no 2d context");
	}
	const { data: pixels } = context.getImageData(0, 0, canvas.width, canvas.height);
	let matches = 0;
	for (let offset = 0; offset < pixels.length; offset += 4) {
		if (
			(pixels[offset + 3] ?? 0) >= 250 &&
			Math.abs((pixels[offset] ?? 0) - target.red) <= 2 &&
			Math.abs((pixels[offset + 1] ?? 0) - target.green) <= 2 &&
			Math.abs((pixels[offset + 2] ?? 0) - target.blue) <= 2
		) {
			matches += 1;
		}
	}
	return matches;
};

const data = [
	{ time: new Date("2026-07-18T10:00:00Z"), p50: 120 },
	{ time: new Date("2026-07-18T10:01:00Z"), p50: 132 },
	{ time: new Date("2026-07-18T10:02:00Z"), p50: 110 },
];

test("custom reference-line colors resolve through the color pass's one style read", async () => {
	// Why a count of style reads: one read per pass is the contract, and the
	// painted pixels look the same however many reads produced them. The pixels
	// prove the colors reach the canvas.
	const reads = vi.spyOn(window, "getComputedStyle");
	const { container } = render(
		<div style={{ width: 400, height: 200 }}>
			<CanvasLineChartRoot data={data} xKey="time" animate={false} aria-label="Latency">
				<LineChart.Line dataKey="p50" label="p50" color="blue" />
				<LineChart.ReferenceLine y={125} label="SLO" color="#e40014" />
				<LineChart.ReferenceLine y={115} color="#0044ff" />
			</CanvasLineChartRoot>
		</div>,
	);
	const canvas = await findChartCanvas(container);
	await waitFor(() => {
		expect(countPixels(canvas, { red: 0xe4, green: 0x00, blue: 0x14 })).toBeGreaterThan(0);
		expect(countPixels(canvas, { red: 0x00, green: 0x44, blue: 0xff })).toBeGreaterThan(0);
	});
	expect(reads).toHaveBeenCalledTimes(1);
});
