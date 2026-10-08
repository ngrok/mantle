"use client";

import { render, screen, waitFor } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, expect, test } from "vitest";
import { LineChart } from "../line-chart/index.js";

/**
 * Real-browser visibility tests: a chart paints once an `IntersectionObserver`
 * reports it within a viewport of the visible area and releases its canvas three
 * viewports away. Both need real layout, a real observer, and real scrolling.
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

afterEach(() => {
	window.scrollTo(0, 0);
});

const data = [
	{ t: 0, v: 40 },
	{ t: 1, v: 90 },
	{ t: 2, v: 65 },
];

const chart = (name: string) => (
	<div style={{ width: 400, height: 200 }}>
		<LineChart.Root data={data} xKey="t" aria-label={name} animate={false}>
			<LineChart.Line dataKey="v" label="v" />
		</LineChart.Root>
	</div>
);

type Chart = { root: HTMLElement; plot: HTMLElement; canvas: HTMLCanvasElement };

const chartNamed = (name: string): Chart => {
	const overlay = screen.getByRole("application", { name });
	const root = overlay.closest('[data-slot="line-chart"]');
	const plot = overlay.parentElement;
	const canvas = plot?.querySelector("canvas");
	if (
		!(root instanceof HTMLElement) ||
		!(plot instanceof HTMLElement) ||
		!(canvas instanceof HTMLCanvasElement)
	) {
		throw new Error(`expected the "${name}" chart to render its root, plot, and canvas`);
	}
	return { root, plot, canvas };
};

/** The backing-store width a painted canvas holds for its plot. */
const paintedWidth = ({ plot }: Chart): number => Math.round(plot.clientWidth * devicePixelRatio);

/**
 * A chart in view at the top, a spacer four viewports tall, and a chart past
 * it: beyond the near band (one viewport) and the far band (three).
 */
const renderPage = () => {
	render(
		<>
			{chart("Top chart")}
			<div style={{ height: window.innerHeight * 4 }} />
			{chart("Far chart")}
		</>,
	);
	return { top: chartNamed("Top chart"), far: chartNamed("Far chart") };
};

const scrollToBottom = (): void => {
	window.scrollTo(0, document.documentElement.scrollHeight);
};

/** Resolves once `chart` has painted, which also proves the observers delivered. */
const painted = (chart: Chart): Promise<void> =>
	waitFor(() => {
		expect(chart.canvas.width).toBe(paintedWidth(chart));
	});

test("a chart below the fold stays dormant while the chart in view paints", async () => {
	const { top, far } = renderPage();
	await painted(top);
	// A chart that paints regardless of visibility holds a bitmap here.
	expect(far.root).toHaveAttribute("data-state", "dormant");
	expect(far.canvas.width).toBe(0);
});

test("scrolling to a dormant chart paints it but mounts no data table", async () => {
	const { top, far } = renderPage();
	await painted(top);
	scrollToBottom();
	await painted(far);
	// Visibility paints; only focus mounts the table, so a list of sparklines holds none.
	expect(far.root).toHaveAttribute("data-state", "dormant");
	expect(far.root.querySelector('[data-slot="line-chart-data-table"]')).toBeNull();
});

test("three viewports away the canvas is released, and it paints again on return", async () => {
	const { far } = renderPage();
	scrollToBottom();
	await painted(far);

	window.scrollTo(0, 0);
	await waitFor(() => {
		expect(far.canvas.width).toBe(0);
	});

	scrollToBottom();
	await painted(far);
});

test("beforeprint paints a dormant chart synchronously and afterprint releases it", async () => {
	const { top, far } = renderPage();
	await painted(top);
	expect(far.canvas.width).toBe(0);

	window.dispatchEvent(new Event("beforeprint"));
	// No frame runs before the print snapshot, so a listener that only schedules prints blank.
	expect(far.canvas.width).toBe(paintedWidth(far));

	window.dispatchEvent(new Event("afterprint"));
	expect(far.canvas.width).toBe(0);
	expect(top.canvas.width).toBe(paintedWidth(top));
});
