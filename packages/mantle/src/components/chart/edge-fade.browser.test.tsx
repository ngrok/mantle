"use client";

import { render, waitFor } from "@testing-library/react";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { AreaChart } from "../area-chart/index.js";
import { LineChart } from "../line-chart/index.js";

/**
 * Real-browser canvas-pixel tests for the liveline-style left-edge scroll
 * mask: streaming window slides fade the marks out through a band at the
 * plot's left edge (a destination-out gradient on an offscreen layer).
 * happy-dom cannot exercise this — it has no real 2D context or paint.
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
	padding: 0;
	margin: -1px;
	overflow: hidden;
	clip: rect(0, 0, 0, 0);
	white-space: nowrap;
	border-width: 0;
}
/* Browser tests load no Tailwind build; mirror the chart's structural layout
   classes so the plot geometry is realistic. */
[data-slot="area-chart"],
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
[data-slot$="-tooltip"] {
	position: absolute;
	left: 0;
	top: 0;
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

const WINDOW_SIZE = 30;

/** A sliding window of constant-value rows starting at x = `start`. */
const windowAt = (start: number) =>
	Array.from({ length: WINDOW_SIZE }, (_, index) => ({ x: start + index, value: 100 }));

/** Ten more constant-value rows to append past x = `start`, keeping the window's start. */
const growthAt = (start: number) =>
	Array.from({ length: 10 }, (_, index) => ({ x: start + index, value: 100 }));

/** Resolve on the next animation frame — the granularity paint decisions happen at. */
const nextFrame = (): Promise<number> =>
	new Promise((resolve) => {
		requestAnimationFrame(resolve);
	});

const Chart = ({
	data,
	animate = false,
}: {
	data: Array<{ x: number; value: number }>;
	animate?: boolean;
}) => (
	<div style={{ width: 600, height: 300 }}>
		{/* animate=false so the fade strength snaps: deterministic pixels. */}
		<AreaChart.Root data={data} xKey="x" animate={animate} aria-label="Live traffic">
			<AreaChart.Area dataKey="value" label="Value" />
		</AreaChart.Root>
	</div>
);

/**
 * A gridded LINE chart: the mask exists so the erase spares the grid painted
 * beneath the marks, and a line leaves the gridlines uncovered everywhere but
 * its own 2px stroke — so grid ink (opaque grey) and mark ink (blue) stay
 * separable per pixel, which an area wash would blend.
 */
const GriddedChart = ({ data }: { data: Array<{ x: number; value: number }> }) => (
	<div style={{ width: 600, height: 300 }}>
		<LineChart.Root data={data} xKey="x" animate={false} aria-label="Live traffic">
			<LineChart.Grid />
			<LineChart.Line dataKey="value" label="Value" color="chart-1" />
		</LineChart.Root>
	</div>
);

const canvasContext = (canvas: HTMLCanvasElement): CanvasRenderingContext2D => {
	const context = canvas.getContext("2d");
	if (context == null) {
		throw new Error("expected the chart canvas to have a 2d context");
	}
	return context;
};

/** The painted alpha at a CSS-pixel position on the chart canvas. */
const alphaAt = (canvas: HTMLCanvasElement, cssX: number, cssY: number): number => {
	const context = canvasContext(canvas);
	const scaleX = canvas.width / canvas.clientWidth;
	const scaleY = canvas.height / canvas.clientHeight;
	const pixel = context.getImageData(Math.round(cssX * scaleX), Math.round(cssY * scaleY), 1, 1);
	return pixel.data[3] ?? 0;
};

type ColumnInk = {
	/** Opaque grey pixels: hairline gridlines, which the mask must never erase. */
	gridPixels: number;
	/** The strongest remaining alpha on the blue series stroke, 0 once erased. */
	markAlpha: number;
};

/** Separate grid ink from mark ink down one CSS-pixel column of the canvas. */
const scanColumn = (canvas: HTMLCanvasElement, cssX: number): ColumnInk => {
	const context = canvasContext(canvas);
	const scaleX = canvas.width / canvas.clientWidth;
	const column = context.getImageData(Math.round(cssX * scaleX), 0, 1, canvas.height);
	const ink: ColumnInk = { gridPixels: 0, markAlpha: 0 };
	for (let offset = 0; offset < column.data.length; offset += 4) {
		const red = column.data[offset] ?? 0;
		const green = column.data[offset + 1] ?? 0;
		const blue = column.data[offset + 2] ?? 0;
		const alpha = column.data[offset + 3] ?? 0;
		if (alpha === 255 && Math.abs(red - green) < 12 && Math.abs(green - blue) < 12) {
			ink.gridPixels += 1;
			continue;
		}
		if (alpha > 0 && blue > 200 && red < 150) {
			ink.markAlpha = Math.max(ink.markAlpha, alpha);
		}
	}
	return ink;
};

describe("left-edge scroll mask", () => {
	test("a sliding window fades the marks at the left edge, then decays once idle", async () => {
		const { container, rerender } = render(<Chart data={windowAt(0)} />);
		const canvas = container.querySelector("canvas");
		if (!(canvas instanceof HTMLCanvasElement)) {
			throw new Error("expected the chart canvas to render");
		}
		await waitFor(() => {
			expect(canvas.width).toBeGreaterThan(0);
		});
		// With no y axis composed, the plot starts at the 8px padding; x=12 sits
		// inside the 40px fade band, x=108 well past it. The constant-value area
		// fill covers both sample points at the same alpha when unmasked.
		const LEFT_X = 12;
		const RIGHT_X = 108;
		const SAMPLE_Y = 150;
		await waitFor(() => {
			const left = alphaAt(canvas, LEFT_X, SAMPLE_Y);
			const right = alphaAt(canvas, RIGHT_X, SAMPLE_Y);
			expect(left).toBeGreaterThan(0);
			expect(Math.abs(left - right)).toBeLessThanOrEqual(8);
		});
		// Slide the window twice: append newer rows, drop the oldest — the
		// streaming signature that activates the mask.
		rerender(<Chart data={windowAt(1)} />);
		rerender(<Chart data={windowAt(2)} />);
		await waitFor(() => {
			const left = alphaAt(canvas, LEFT_X, SAMPLE_Y);
			const right = alphaAt(canvas, RIGHT_X, SAMPLE_Y);
			expect(right).toBeGreaterThan(0);
			expect(left).toBeLessThan(right * 0.5);
		});
		// The mask is transient: once the stream idles past the linger window,
		// the left edge returns to full strength.
		await waitFor(
			() => {
				const left = alphaAt(canvas, LEFT_X, SAMPLE_Y);
				const right = alphaAt(canvas, RIGHT_X, SAMPLE_Y);
				expect(left).toBeGreaterThan(0);
				expect(Math.abs(left - right)).toBeLessThanOrEqual(8);
			},
			{ timeout: 3000, interval: 100 },
		);
	});

	test("the eased ramp decays on its own frames (the production animate default)", async () => {
		// The test above snaps the strength, which skips the eased branch entirely.
		// On the animated path the decay is driven by a one-shot timer that wakes a
		// single frame; the ramp only completes because paint reports itself as
		// still animating and re-schedules. Without that, the mask freezes partway
		// erased until the next data push — for a stream that has stopped, forever.
		const { container, rerender } = render(<Chart animate data={windowAt(0)} />);
		const canvas = container.querySelector("canvas");
		if (!(canvas instanceof HTMLCanvasElement)) {
			throw new Error("expected the chart canvas to render");
		}
		await waitFor(() => {
			expect(canvas.width).toBeGreaterThan(0);
		});
		const LEFT_X = 12;
		const RIGHT_X = 108;
		const SAMPLE_Y = 150;
		rerender(<Chart animate data={windowAt(1)} />);
		rerender(<Chart animate data={windowAt(2)} />);
		await waitFor(() => {
			const left = alphaAt(canvas, LEFT_X, SAMPLE_Y);
			const right = alphaAt(canvas, RIGHT_X, SAMPLE_Y);
			expect(right).toBeGreaterThan(0);
			expect(left).toBeLessThan(right * 0.5);
		});
		// 1s linger, then the ease-out — comfortably inside 4s if it keeps
		// scheduling frames, never reached if it stalls at its first eased step.
		await waitFor(
			() => {
				const left = alphaAt(canvas, LEFT_X, SAMPLE_Y);
				const right = alphaAt(canvas, RIGHT_X, SAMPLE_Y);
				expect(right).toBeGreaterThan(0);
				expect(Math.abs(left - right)).toBeLessThanOrEqual(8);
			},
			{ timeout: 4000, interval: 100 },
		);
	});

	test("an append that keeps the window's start never fades the left edge", async () => {
		// Only a SLIDE fades: the first x advanced (rows scrolled out of view) while
		// the last kept up. A pure append grows the domain and drops nothing, so
		// relaxing the comparison to `>=` would dissolve the left 40px of every
		// growing chart. The slide at the end proves the mask still works here —
		// otherwise this test would pass on a chart that never fades at all.
		const { container, rerender } = render(<Chart data={windowAt(0)} />);
		const canvas = container.querySelector("canvas");
		if (!(canvas instanceof HTMLCanvasElement)) {
			throw new Error("expected the chart canvas to render");
		}
		await waitFor(() => {
			expect(canvas.width).toBeGreaterThan(0);
		});
		const LEFT_X = 12;
		const RIGHT_X = 108;
		const SAMPLE_Y = 150;
		const grown = [...windowAt(0), ...growthAt(WINDOW_SIZE)];
		rerender(<Chart data={grown} />);
		// The data table is the ingest receipt: once it lists the appended rows the
		// engine has seen them, so the next frames are the ones under test.
		await waitFor(() => {
			expect(container.querySelectorAll("tbody tr")).toHaveLength(grown.length);
		});
		// There is nothing to wait FOR here — the claim is that no frame fades — so
		// check the invariant on every frame of the linger a mask would have held
		// for. A re-measure can leave one frame blank (cleared, ink not yet
		// painted); that keeps the two edges equal, and `inkedFrames` proves the
		// window was not vacuous.
		let inkedFrames = 0;
		for (let frame = 0; frame < 10; frame++) {
			await nextFrame();
			const left = alphaAt(canvas, LEFT_X, SAMPLE_Y);
			const right = alphaAt(canvas, RIGHT_X, SAMPLE_Y);
			expect(Math.abs(left - right)).toBeLessThanOrEqual(8);
			if (right > 0) {
				inkedFrames += 1;
			}
		}
		expect(inkedFrames).toBeGreaterThan(0);
		// Now actually slide the same window: the mask must engage.
		rerender(<Chart data={grown.map((row) => ({ ...row, x: row.x + 1 }))} />);
		await waitFor(() => {
			const left = alphaAt(canvas, LEFT_X, SAMPLE_Y);
			const right = alphaAt(canvas, RIGHT_X, SAMPLE_Y);
			expect(right).toBeGreaterThan(0);
			expect(left).toBeLessThan(right * 0.5);
		});
	});

	test("a non-slide data swap clears the mask immediately instead of lingering", async () => {
		// Only the streaming signature (first advanced, last kept up) may fade the
		// edge. Activating on any x-vector change would dissolve the left 40px of
		// the plot for a second on every ordinary refresh — a date-range swap, a
		// filter change, a backward pan.
		const { container, rerender } = render(<Chart data={windowAt(50)} />);
		const canvas = container.querySelector("canvas");
		if (!(canvas instanceof HTMLCanvasElement)) {
			throw new Error("expected the chart canvas to render");
		}
		await waitFor(() => {
			expect(canvas.width).toBeGreaterThan(0);
		});
		const LEFT_X = 12;
		const RIGHT_X = 108;
		const SAMPLE_Y = 150;
		rerender(<Chart data={windowAt(51)} />);
		rerender(<Chart data={windowAt(52)} />);
		await waitFor(() => {
			const left = alphaAt(canvas, LEFT_X, SAMPLE_Y);
			expect(left).toBeLessThan(alphaAt(canvas, RIGHT_X, SAMPLE_Y) * 0.5);
		});
		// A backward jump is not a stream: the very next paint deactivates the
		// mask, well inside the 1s linger an activation would hold it for.
		rerender(<Chart data={windowAt(0)} />);
		await waitFor(
			() => {
				const left = alphaAt(canvas, LEFT_X, SAMPLE_Y);
				const right = alphaAt(canvas, RIGHT_X, SAMPLE_Y);
				expect(left).toBeGreaterThan(0);
				expect(Math.abs(left - right)).toBeLessThanOrEqual(8);
			},
			{ timeout: 400, interval: 16 },
		);
	});

	test("the erase spares the grid painted beneath the marks", async () => {
		// The marks go through an offscreen layer for exactly this reason: running
		// the destination-out gradient on the main context would erase the
		// gridlines in the fade band along with the series, for the whole linger.
		const { container, rerender } = render(<GriddedChart data={windowAt(0)} />);
		const canvas = container.querySelector("canvas");
		if (!(canvas instanceof HTMLCanvasElement)) {
			throw new Error("expected the chart canvas to render");
		}
		await waitFor(() => {
			expect(canvas.width).toBeGreaterThan(0);
		});
		const LEFT_X = 12;
		const RIGHT_X = 108;
		await waitFor(() => {
			const left = scanColumn(canvas, LEFT_X);
			expect(left.gridPixels).toBeGreaterThan(0);
			expect(left.markAlpha).toBeGreaterThan(200);
			expect(left.gridPixels).toBe(scanColumn(canvas, RIGHT_X).gridPixels);
		});
		rerender(<GriddedChart data={windowAt(1)} />);
		rerender(<GriddedChart data={windowAt(2)} />);
		await waitFor(() => {
			const left = scanColumn(canvas, LEFT_X);
			const right = scanColumn(canvas, RIGHT_X);
			// The series stroke is erased at the left edge …
			expect(right.markAlpha).toBeGreaterThan(200);
			expect(left.markAlpha).toBeLessThan(right.markAlpha * 0.5);
			// … while every gridline crossing the same column survives untouched.
			expect(right.gridPixels).toBeGreaterThan(0);
			expect(left.gridPixels).toBe(right.gridPixels);
		});
	});
});
