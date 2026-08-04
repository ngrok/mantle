"use client";

import { render, waitFor } from "@testing-library/react";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { BarChart } from "../bar-chart/index.js";
import { BAR_DENSE_THICKNESS, BAR_MAX_THICKNESS } from "./bar-geometry.js";

/**
 * Real-browser geometry tests for how thick a bar paints. `bar-geometry.test.ts`
 * pins the rule; these prove the rule reaches the canvas through the band layout
 * the engine measures, which happy-dom has no real geometry for.
 *
 * Each test measures the widest run of series ink across the ink-heaviest row of
 * the canvas — one bar, in CSS pixels — and asserts against the shipped
 * constants rather than a re-derived number.
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

beforeAll(() => {
	styleElement = document.createElement("style");
	styleElement.textContent = STYLE;
	document.head.appendChild(styleElement);
});

afterAll(() => {
	styleElement.remove();
});

/** A blue-dominant pixel is chart-1 fill; grey chrome and the ground are not. */
const isSeriesInk = (pixels: Uint8ClampedArray, offset: number): boolean => {
	const red = pixels[offset] ?? 0;
	const blue = pixels[offset + 2] ?? 0;
	const alpha = pixels[offset + 3] ?? 0;
	return alpha > 200 && blue > 200 && red < 150;
};

/**
 * The widest single bar on the canvas, in CSS pixels: the longest unbroken run
 * of series ink along the row that carries the most of it. Bars all rise from
 * the shared baseline, so the busiest row crosses every one of them.
 */
const widestBar = (canvas: HTMLCanvasElement): number => {
	const context = canvas.getContext("2d");
	if (context == null) {
		throw new Error("no 2d context");
	}
	const { width, height } = canvas;
	const { data: pixels } = context.getImageData(0, 0, width, height);
	let bestRowInk = 0;
	let bestRowRun = 0;
	for (let y = 0; y < height; y += 1) {
		let rowInk = 0;
		let longestRun = 0;
		let run = 0;
		for (let x = 0; x < width; x += 1) {
			if (isSeriesInk(pixels, (y * width + x) * 4)) {
				run += 1;
				rowInk += 1;
				longestRun = Math.max(longestRun, run);
			} else {
				run = 0;
			}
		}
		if (rowInk > bestRowInk) {
			bestRowInk = rowInk;
			bestRowRun = longestRun;
		}
	}
	if (bestRowInk === 0) {
		throw new Error("no series ink on the canvas");
	}
	return bestRowRun / window.devicePixelRatio;
};

const seriesOf = (count: number) =>
	Array.from({ length: count }, (_, index) => ({
		cat: `Day ${index + 1}`,
		v: 40 + ((index * 17) % 50),
	}));

const chart = (rows: ReturnType<typeof seriesOf>) => (
	<div style={{ width: 600, height: 300 }}>
		<BarChart.Root data={rows} xKey="cat" animate={false} aria-label="Values by day">
			<BarChart.Bar dataKey="v" label="Value" color="chart-1" />
		</BarChart.Root>
	</div>
);

const measure = async (rows: ReturnType<typeof seriesOf>): Promise<number> => {
	const { container } = render(chart(rows));
	const canvas = container.querySelector("canvas");
	if (!(canvas instanceof HTMLCanvasElement)) {
		throw new Error("expected the chart canvas to render");
	}
	let measured = 0;
	await waitFor(() => {
		expect(canvas.width).toBeGreaterThan(0);
		measured = widestBar(canvas);
		expect(measured).toBeGreaterThan(0);
	});
	return measured;
};

describe("bar thickness on the painted canvas", () => {
	test("a sparse chart paints bars wider than the dense cap, and no wider than the ceiling", async () => {
		// The reported defect: seven bars across a 600px chart each painted 24px and
		// sat in ~55px of air, which read as a gap-toothed row.
		const measured = await measure(seriesOf(7));
		expect(measured).toBeGreaterThan(BAR_DENSE_THICKNESS);
		expect(measured).toBeLessThanOrEqual(BAR_MAX_THICKNESS + 1);
	});

	test("a dense chart still fills its slot, so the cap decides nothing", async () => {
		// 30 categories give a slot narrower than the dense cap. The bar must be the
		// slot, which is exactly what it was before the fill rule existed.
		const measured = await measure(seriesOf(30));
		expect(measured).toBeLessThan(BAR_DENSE_THICKNESS);
	});

	test("two categories stop at the ceiling instead of painting panels", async () => {
		// Half a 600px plot each, unclamped — the case the ceiling exists for.
		const measured = await measure(seriesOf(2));
		expect(measured).toBeGreaterThan(BAR_MAX_THICKNESS - 2);
		expect(measured).toBeLessThanOrEqual(BAR_MAX_THICKNESS + 1);
	});

	test("thickness rises as categories thin out, with no jump at the clamps", async () => {
		// One monotonic curve from dense to sparse. A rule that switched between two
		// fixed widths would pass the bounds above and fail here.
		const widths = [];
		for (const count of [30, 20, 12, 7, 5]) {
			widths.push(await measure(seriesOf(count)));
		}
		for (let index = 1; index < widths.length; index++) {
			expect(widths[index]).toBeGreaterThan(widths[index - 1] ?? Number.NaN);
		}
	});
});
