"use client";

import { render, waitFor } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, describe, expect, test, vi } from "vitest";
import type { MockInstance } from "vitest";
import { BarChart } from "../bar-chart/index.js";
import { LineChart } from "../line-chart/index.js";

/**
 * Real-browser regression tests for MNTL-56: axes backed by integer-only data
 * must never paint fractional tick labels ("0.5" on a request-count axis).
 * Tick labels are canvas ink, so happy-dom (null 2d context) never reaches the
 * paint path — these spy on `fillText` in Chromium instead and assert on the
 * painted strings.
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
[data-slot="bar-chart"],
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
let fillTextSpy: MockInstance;

beforeAll(() => {
	styleElement = document.createElement("style");
	styleElement.textContent = STYLE;
	document.head.appendChild(styleElement);
	// Calls through to the real implementation, so painting is unchanged — the
	// spy only records which strings hit the canvas.
	fillTextSpy = vi.spyOn(CanvasRenderingContext2D.prototype, "fillText");
});

afterEach(() => {
	fillTextSpy.mockClear();
});

afterAll(() => {
	fillTextSpy.mockRestore();
	styleElement.remove();
});

const paintedLabels = (): string[] => fillTextSpy.mock.calls.map((call) => String(call[0]));

/**
 * A tick label with a decimal fraction, in either decimal-separator locale.
 * The datasets here stay below 1,000 so grouping separators never match.
 */
const isFractionalLabel = (label: string): boolean => /^\d+[.,]\d+$/.test(label);

describe("integer-valued data never paints fractional axis ticks (MNTL-56)", () => {
	test("vertical bars: a small count domain ticks by whole numbers", async () => {
		render(
			<div style={{ width: 600, height: 300 }}>
				<BarChart.Root
					data={[
						{ cat: "A", count: 1 },
						{ cat: "B", count: 3 },
					]}
					xKey="cat"
					animate={false}
					aria-label="Request counts"
				>
					<BarChart.XAxis />
					<BarChart.YAxis />
					<BarChart.Bar dataKey="count" label="Count" color="chart-1" />
				</BarChart.Root>
			</div>,
		);
		await waitFor(() => {
			// The [0, 3] domain's top tick proves the value axis painted.
			expect(paintedLabels()).toContain("3");
		});
		expect(paintedLabels().filter(isFractionalLabel)).toEqual([]);
	});

	test("horizontal bars: the value axis along the bottom keeps whole-number ticks", async () => {
		render(
			<div style={{ width: 600, height: 300 }}>
				<BarChart.Root
					data={[
						{ cat: "A", count: 1 },
						{ cat: "B", count: 3 },
					]}
					xKey="cat"
					orientation="horizontal"
					animate={false}
					aria-label="Request counts, horizontal"
				>
					<BarChart.XAxis />
					<BarChart.YAxis />
					<BarChart.Bar dataKey="count" label="Count" color="chart-1" />
				</BarChart.Root>
			</div>,
		);
		await waitFor(() => {
			expect(paintedLabels()).toContain("3");
		});
		expect(paintedLabels().filter(isFractionalLabel)).toEqual([]);
	});

	test("a linear x axis over integer positions ticks by whole numbers", async () => {
		// y values are large integers (whole-step ticks regardless), so any
		// fractional label could only come from the [0, 3] linear x domain.
		render(
			<div style={{ width: 600, height: 300 }}>
				<LineChart.Root
					data={[
						{ attempt: 0, latency: 100 },
						{ attempt: 1, latency: 240 },
						{ attempt: 2, latency: 180 },
						{ attempt: 3, latency: 300 },
					]}
					xKey="attempt"
					animate={false}
					aria-label="Latency by attempt"
				>
					<LineChart.XAxis />
					<LineChart.YAxis />
					<LineChart.Line dataKey="latency" label="Latency" color="chart-1" />
				</LineChart.Root>
			</div>,
		);
		await waitFor(() => {
			// An interior x tick proves the linear x axis painted.
			expect(paintedLabels()).toContain("2");
		});
		expect(paintedLabels().filter(isFractionalLabel)).toEqual([]);
	});

	test("fractional data keeps sub-integer ticks (the clamp is data-driven, not global)", async () => {
		render(
			<div style={{ width: 600, height: 300 }}>
				<LineChart.Root
					data={[
						{ cat: "A", rate: 0.2 },
						{ cat: "B", rate: 0.8 },
					]}
					xKey="cat"
					animate={false}
					aria-label="Error rate"
				>
					<LineChart.XAxis />
					<LineChart.YAxis />
					<LineChart.Line dataKey="rate" label="Rate" color="chart-1" />
				</LineChart.Root>
			</div>,
		);
		await waitFor(() => {
			expect(paintedLabels().some(isFractionalLabel)).toBe(true);
		});
	});
});
