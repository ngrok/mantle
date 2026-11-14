"use client";

import { render, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { AreaChart } from "../area-chart/index.js";
import { BarChart } from "../bar-chart/index.js";
import { LineChart } from "../line-chart/index.js";
import { ScatterPlot } from "../scatter-plot/index.js";

/**
 * Real-browser tests of touch on each 2D chart family. The families share one
 * Root, and these tests pin that each one shows its tooltip under a finger.
 * The hit test needs real layout, so happy-dom cannot run them.
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
   the overlay has a size for the hit test. */
[data-slot$="-chart"],
[data-slot="scatter-plot"] {
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
[data-slot$="-plot"] > svg,
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

/** One value for every x, so a drag along the middle of the plot crosses every point. */
const data = Array.from({ length: 12 }, (_, index) => ({ x: index, v: 50 }));

const families: { slot: string; chart: ReactNode }[] = [
	{
		slot: "bar-chart",
		chart: (
			<BarChart.Root data={data} xKey="x" animate={false} aria-label="Bars">
				<BarChart.Bar dataKey="v" label="Value" color="blue" />
				<BarChart.Tooltip />
			</BarChart.Root>
		),
	},
	{
		slot: "line-chart",
		chart: (
			<LineChart.Root data={data} xKey="x" animate={false} aria-label="Line">
				<LineChart.Line dataKey="v" label="Value" color="blue" />
				<LineChart.Tooltip />
			</LineChart.Root>
		),
	},
	{
		slot: "area-chart",
		chart: (
			<AreaChart.Root data={data} xKey="x" animate={false} aria-label="Area">
				<AreaChart.Area dataKey="v" label="Value" color="blue" />
				<AreaChart.Tooltip />
			</AreaChart.Root>
		),
	},
	{
		slot: "scatter-plot",
		chart: (
			<ScatterPlot.Root data={data} xKey="x" animate={false} aria-label="Points">
				<ScatterPlot.Point dataKey="v" label="Value" color="blue" />
				<ScatterPlot.Tooltip />
			</ScatterPlot.Root>
		),
	},
];

describe.each(families)("$slot under a finger", ({ slot, chart }) => {
	test("a drag scrubs the tooltip, the tooltip stays after the finger lifts, and a press outside hides it", async () => {
		const { container } = render(<div style={{ width: 600, height: 300 }}>{chart}</div>);
		const overlay = container.querySelector('[role="application"]');
		if (!(overlay instanceof HTMLElement)) {
			throw new Error("expected the interaction overlay to render");
		}
		const touch = (type: string, fraction: number, init: PointerEventInit = {}) => {
			const rect = overlay.getBoundingClientRect();
			overlay.dispatchEvent(
				new PointerEvent(type, {
					bubbles: true,
					pointerType: "touch",
					clientX: rect.left + rect.width * fraction,
					clientY: rect.top + rect.height * 0.5,
					...init,
				}),
			);
		};
		const tooltip = () => container.querySelector(`[data-slot="${slot}-tooltip"]`);
		// Re-dispatch inside waitFor: the chart activates a frame after it mounts,
		// and the test browser's idle mouse can send a leave when the tooltip
		// first mounts under it. A phone has no mouse.
		let start = "";
		await waitFor(() => {
			touch("pointerdown", 0.1);
			start = tooltip()?.textContent ?? "";
			expect(start).not.toBe("");
			expect(tooltip()).toHaveStyle({ opacity: "1" });
		});
		let end = "";
		await waitFor(() => {
			touch("pointermove", 0.9);
			end = tooltip()?.textContent ?? "";
			expect(end).not.toBe(start);
			expect(tooltip()).toHaveStyle({ opacity: "1" });
		});
		// A lifted finger also leaves the overlay. React reads the leave from `pointerout`.
		touch("pointerup", 0.9);
		touch("pointerout", 0.9, { relatedTarget: document.body });
		await new Promise((resolve) => {
			requestAnimationFrame(resolve);
		});
		expect(tooltip()).toHaveStyle({ opacity: "1" });
		expect(tooltip()?.textContent).toBe(end);
		document.body.dispatchEvent(
			new PointerEvent("pointerdown", { bubbles: true, pointerType: "touch" }),
		);
		await waitFor(() => {
			expect(tooltip()).toHaveStyle({ opacity: "0" });
		});
	});
});
