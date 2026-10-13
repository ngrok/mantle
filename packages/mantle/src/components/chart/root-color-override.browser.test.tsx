"use client";

import { render, waitFor } from "@testing-library/react";
import { findChartCanvas } from "../../test-utils/find-chart-canvas.js";
import { afterAll, beforeAll, expect, test, vi } from "vitest";
import { BarChart } from "../bar-chart/index.js";

/**
 * Real-browser paint test of a color override that changes after the first
 * paint. The engine caches its resolved colors per theme, so a new `className`
 * or `style` on the Root must re-resolve them, or the canvas keeps the old
 * palette. Only a real browser paints the canvas.
 */
const BLUE = { red: 62, green: 111, blue: 244 };
const RED = { red: 228, green: 0, blue: 20 };

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
.token-blue {
	--color-chart-1: #3e6ff4;
}
.token-red {
	--color-chart-1: #e40014;
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

test("a new className on the Root repaints the series from its new token value", async () => {
	const chart = (className: string) => (
		<div style={{ width: 600, height: 300 }}>
			<BarChart.Root
				data={data}
				xKey="cat"
				animate={false}
				aria-label="Values by category"
				className={className}
			>
				<BarChart.Bar dataKey="v" label="Value" />
			</BarChart.Root>
		</div>
	);
	const { container, rerender } = render(chart("token-blue"));
	const canvas = await findChartCanvas(container);
	await waitFor(() => {
		expect(countPixels(canvas, BLUE)).toBeGreaterThan(1000);
	});
	rerender(chart("token-red"));
	await waitFor(() => {
		expect(countPixels(canvas, RED)).toBeGreaterThan(1000);
		expect(countPixels(canvas, BLUE)).toBe(0);
	});
});

test("a new inline color on the Root repaints a currentColor series", async () => {
	const chart = (color: string) => (
		<div style={{ width: 600, height: 300 }}>
			<BarChart.Root
				data={data}
				xKey="cat"
				animate={false}
				aria-label="Values by category"
				style={{ color }}
			>
				<BarChart.Bar dataKey="v" label="Value" color="currentColor" />
			</BarChart.Root>
		</div>
	);
	const { container, rerender } = render(chart("#3e6ff4"));
	const canvas = await findChartCanvas(container);
	await waitFor(() => {
		expect(countPixels(canvas, BLUE)).toBeGreaterThan(1000);
	});
	rerender(chart("#e40014"));
	await waitFor(() => {
		expect(countPixels(canvas, RED)).toBeGreaterThan(1000);
		expect(countPixels(canvas, BLUE)).toBe(0);
	});
});

test("a re-render with an equal inline style resolves the colors once", async () => {
	// Why a count of style reads: a second pass paints the same pixels, so the
	// read is the only trace of a cache the re-render dropped for nothing.
	const reads = vi.spyOn(window, "getComputedStyle");
	const chart = () => (
		<div style={{ width: 600, height: 300 }}>
			<BarChart.Root
				data={data}
				xKey="cat"
				animate={false}
				aria-label="Values by category"
				style={{ color: "#3e6ff4" }}
			>
				<BarChart.Bar dataKey="v" label="Value" color="currentColor" />
			</BarChart.Root>
		</div>
	);
	const { container, rerender } = render(chart());
	const canvas = await findChartCanvas(container);
	await waitFor(() => {
		expect(countPixels(canvas, BLUE)).toBeGreaterThan(1000);
	});
	expect(reads).toHaveBeenCalledTimes(1);
	rerender(chart());
	// Why a frame: the engine commits in the next animation frame, where a
	// dropped cache would read again.
	await new Promise<void>((resolve) => {
		requestAnimationFrame(() => resolve());
	});
	expect(reads).toHaveBeenCalledTimes(1);
});
