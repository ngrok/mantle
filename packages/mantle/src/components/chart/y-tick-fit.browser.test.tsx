"use client";

import { render, waitFor } from "@testing-library/react";
import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import type { MockInstance } from "vitest";
import { BarChart } from "../bar-chart/index.js";
import type { YTickContext } from "./types.js";

/**
 * Real-browser regression tests for MNTL-97: a short plot must never paint more
 * y-axis labels than its height holds. Tick labels are canvas ink, so happy-dom
 * (null 2d context) never reaches the paint path. These tests spy on `fillText`
 * in Chromium and assert on the painted strings.
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
// Calls through to the real implementation, so painting is unchanged — the spy only records which
// strings hit the canvas.
beforeEach(() => {
	fillTextSpy = vi.spyOn(CanvasRenderingContext2D.prototype, "fillText");
});

afterAll(() => {
	styleElement.remove();
});

const paintedLabels = (): string[] => fillTextSpy.mock.calls.map((call) => String(call[0]));

/** The distinct painted labels that read as numbers, so x-axis category labels drop out. */
const paintedValueLabels = (): string[] => [
	...new Set(paintedLabels().filter((label) => /^[\d$][\d.,$K]*$/.test(label))),
];

// The 5XX strip from the issue: a maximum near 200 that a count of 3 used to tick by 50.
const data = Array.from({ length: 24 }, (_, index) => ({
	hour: `h${index}`,
	count: 80 + ((index * 37) % 120),
}));

describe("the y axis fits its labels to the plot height (MNTL-97)", () => {
	test("a 64px chart paints two labels, not five", async () => {
		render(
			<div style={{ width: 600, height: 64 }}>
				<BarChart.Root data={data} xKey="hour" animate={false} aria-label="5XX errors">
					<BarChart.XAxis />
					<BarChart.YAxis tickCount={3} />
					<BarChart.Bar dataKey="count" label="Errors" color="chart-1" />
				</BarChart.Root>
			</div>,
		);
		await waitFor(() => {
			expect(paintedValueLabels()).toContain("200");
		});
		expect(paintedValueLabels()).toEqual(["0", "200"]);
	});

	test("a tall chart keeps tickCount as a maximum", async () => {
		render(
			<div style={{ width: 600, height: 400 }}>
				<BarChart.Root data={data} xKey="hour" animate={false} aria-label="5XX errors">
					<BarChart.XAxis />
					<BarChart.YAxis tickCount={3} />
					<BarChart.Bar dataKey="count" label="Errors" color="chart-1" />
				</BarChart.Root>
			</div>,
		);
		await waitFor(() => {
			expect(paintedValueLabels()).toContain("200");
		});
		expect(paintedValueLabels()).toEqual(["0", "100", "200"]);
	});

	test("tickFormat receives the default label and the step", async () => {
		const tickFormat = vi.fn<(value: number, context: YTickContext) => string>(
			(_value, context) => `$${context.defaultLabel}`,
		);
		render(
			<div style={{ width: 600, height: 400 }}>
				<BarChart.Root
					data={[
						{ day: "Mon", cost: 0.0001 },
						{ day: "Tue", cost: 0 },
					]}
					xKey="day"
					animate={false}
					aria-label="Cost"
				>
					<BarChart.YAxis tickFormat={tickFormat} />
					<BarChart.Bar dataKey="cost" label="Cost" color="chart-1" />
				</BarChart.Root>
			</div>,
		);
		await waitFor(() => {
			expect(paintedValueLabels()).toContain("$0.0001");
		});
		const labels = paintedValueLabels();
		// Each tick has its own label: the precision follows the step.
		expect(new Set(labels).size).toBe(labels.length);
		expect(tickFormat).toHaveBeenCalledWith(0.00002, { defaultLabel: "0.00002", step: 0.00002 });
	});
});
