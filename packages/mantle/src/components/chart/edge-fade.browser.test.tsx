"use client";

import { render, waitFor } from "@testing-library/react";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { AreaChart } from "../area-chart/index.js";

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
[data-slot="area-chart"] {
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

const Chart = ({ data }: { data: Array<{ x: number; value: number }> }) => (
	<div style={{ width: 600, height: 300 }}>
		{/* animate=false so the fade strength snaps: deterministic pixels. */}
		<AreaChart.Root data={data} xKey="x" animate={false} aria-label="Live traffic">
			<AreaChart.Area dataKey="value" label="Value" />
		</AreaChart.Root>
	</div>
);

/** The painted alpha at a CSS-pixel position on the chart canvas. */
const alphaAt = (canvas: HTMLCanvasElement, cssX: number, cssY: number): number => {
	const context = canvas.getContext("2d");
	if (context == null) {
		throw new Error("expected the chart canvas to have a 2d context");
	}
	const scaleX = canvas.width / canvas.clientWidth;
	const scaleY = canvas.height / canvas.clientHeight;
	const pixel = context.getImageData(Math.round(cssX * scaleX), Math.round(cssY * scaleY), 1, 1);
	return pixel.data[3] ?? 0;
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
});
