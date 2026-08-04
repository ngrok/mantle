"use client";

import { render, waitFor } from "@testing-library/react";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { BarChart } from "../bar-chart/index.js";

/**
 * Real-browser paint test for `decorative`: the chart drops the categorical
 * palette and fills every series with `--color-chart-decorative`.
 *
 * The canvas resolves that token through a computed-style probe, so only a real
 * browser can show which color reaches the marks. happy-dom returns the token
 * unresolved, which makes the DOM-level checks in `bar-chart.test.tsx` the wiring
 * test and this one the paint test.
 *
 * The two token values below are unmistakable in a pixel scan — a saturated blue
 * against a mid gray — rather than the shipped light-theme pair, whose neutral
 * sits a step off white and could be confused for the transparent ground.
 */
const CHART_1 = { red: 62, green: 111, blue: 244 };
const DECORATIVE = { red: 136, green: 136, blue: 136 };

const STYLE = `
:root {
	--color-chart-1: #3e6ff4;
	--color-chart-2: #3e6ff4;
	--color-chart-decorative: #888888;
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

beforeAll(() => {
	styleElement = document.createElement("style");
	styleElement.textContent = STYLE;
	document.head.appendChild(styleElement);
});

afterAll(() => {
	styleElement.remove();
});

const data = [
	{ cat: "A", v: 40 },
	{ cat: "B", v: 90 },
	{ cat: "C", v: 65 },
];

const canvasOf = (container: HTMLElement): HTMLCanvasElement => {
	const canvas = container.querySelector("canvas");
	if (!(canvas instanceof HTMLCanvasElement)) {
		throw new Error("expected the chart canvas to render");
	}
	return canvas;
};

/**
 * How many pixels match one color within a tolerance, over the whole canvas.
 * The tolerance absorbs the antialiasing along a bar's rounded cap; a bar's
 * interior is the exact color.
 */
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
		const alpha = pixels[offset + 3] ?? 0;
		if (alpha < 250) {
			continue;
		}
		const red = pixels[offset] ?? 0;
		const green = pixels[offset + 1] ?? 0;
		const blue = pixels[offset + 2] ?? 0;
		if (
			Math.abs(red - target.red) <= 2 &&
			Math.abs(green - target.green) <= 2 &&
			Math.abs(blue - target.blue) <= 2
		) {
			matches += 1;
		}
	}
	return matches;
};

describe("a decorative chart's painted fill", () => {
	test("fills every series with the decorative token instead of its palette slot", async () => {
		// Two series, one of them asking for a slot by hand: on a backdrop both paint
		// the same neutral, and no categorical blue reaches the canvas at all.
		const { container } = render(
			<div style={{ width: 600, height: 300 }}>
				<BarChart.Root data={data} xKey="cat" animate={false} decorative>
					<BarChart.Bar dataKey="v" label="Value" color="chart-1" />
				</BarChart.Root>
			</div>,
		);
		const canvas = canvasOf(container);
		await waitFor(() => {
			expect(canvas.width).toBeGreaterThan(0);
			expect(countPixels(canvas, DECORATIVE)).toBeGreaterThan(1000);
			expect(countPixels(canvas, CHART_1)).toBe(0);
		});
	});

	test("a chart with real data paints its palette slot", async () => {
		// The other half of the pair. Without it, a fill that ignored `decorative`
		// and always painted neutral would pass the test above.
		const { container } = render(
			<div style={{ width: 600, height: 300 }}>
				<BarChart.Root data={data} xKey="cat" animate={false} aria-label="Values by category">
					<BarChart.Bar dataKey="v" label="Value" color="chart-1" />
				</BarChart.Root>
			</div>,
		);
		const canvas = canvasOf(container);
		await waitFor(() => {
			expect(canvas.width).toBeGreaterThan(0);
			expect(countPixels(canvas, CHART_1)).toBeGreaterThan(1000);
			expect(countPixels(canvas, DECORATIVE)).toBe(0);
		});
	});
});
