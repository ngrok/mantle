"use client";

import { render, screen, waitFor } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, expect, test } from "vitest";
import { LineChart } from "../line-chart/index.js";

/**
 * Real-browser visibility tests: a chart activates (builds its canvas and
 * paints) once an `IntersectionObserver` reports it within a viewport of the
 * visible area, and releases its canvas three viewports away. Both need real
 * layout, a real observer, and real scrolling.
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
	{ time: new Date("2026-07-18T10:00:00Z"), p50: 120 },
	{ time: new Date("2026-07-18T10:01:00Z"), p50: 132 },
	{ time: new Date("2026-07-18T10:02:00Z"), p50: 110 },
];

const chart = (name: string) => (
	<div style={{ width: 400, height: 200 }}>
		<LineChart.Root data={data} xKey="time" animate={false} aria-label={name}>
			<LineChart.Line dataKey="p50" label="p50" />
		</LineChart.Root>
	</div>
);

type Chart = { root: HTMLElement; plot: HTMLElement };

const chartNamed = (name: string): Chart => {
	const overlay = screen.getByRole("application", { name });
	const root = overlay.closest('[data-slot="line-chart"]');
	const plot = overlay.parentElement;
	if (!(root instanceof HTMLElement) || !(plot instanceof HTMLElement)) {
		throw new Error(`expected the "${name}" chart to render its root and plot`);
	}
	return { root, plot };
};

/** The chart's canvas, or `null` while the chart is dormant. */
const canvasOf = ({ plot }: Chart): HTMLCanvasElement | null => {
	const canvas = plot.querySelector("canvas");
	return canvas instanceof HTMLCanvasElement ? canvas : null;
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
		expect(canvasOf(chart)?.width).toBe(paintedWidth(chart));
	});

test("a chart below the fold stays a shell while the chart in view activates and paints", async () => {
	const { top, far } = renderPage();
	await painted(top);
	// A chart that activates regardless of visibility holds a canvas here.
	expect(far.root).toHaveAttribute("data-state", "dormant");
	expect(canvasOf(far)).toBeNull();
	expect(far.plot.querySelector('[data-slot="line-chart-hover-band"]')).toBeNull();
});

test("scrolling to a dormant chart activates it but mounts no data table", async () => {
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
		expect(canvasOf(far)?.width).toBe(0);
	});

	scrollToBottom();
	await painted(far);
});

test("beforeprint activates and paints a dormant chart synchronously and afterprint releases it", async () => {
	const { top, far } = renderPage();
	await painted(top);
	expect(canvasOf(far)).toBeNull();

	window.dispatchEvent(new Event("beforeprint"));
	// No frame runs before the print snapshot, so a listener that only schedules prints blank.
	expect(canvasOf(far)?.width).toBe(paintedWidth(far));

	window.dispatchEvent(new Event("afterprint"));
	expect(canvasOf(far)?.width).toBe(0);
	expect(canvasOf(top)?.width).toBe(paintedWidth(top));
});

test("beforeprint paints a page whose only chart is dormant", async () => {
	// Why one chart: the Root's print entry is then the only one in the shared
	// listener set, so the engine it creates mid-dispatch gets no turn of its own.
	render(
		<>
			<div style={{ height: window.innerHeight * 4 }} />
			{chart("Lone chart")}
		</>,
	);
	const lone = chartNamed("Lone chart");
	await waitFor(() => {
		expect(screen.getByRole("application", { name: "Lone chart" })).toBeInTheDocument();
	});
	expect(canvasOf(lone)).toBeNull();

	window.dispatchEvent(new Event("beforeprint"));
	expect(canvasOf(lone)?.width).toBe(paintedWidth(lone));
	window.dispatchEvent(new Event("afterprint"));
});

test("focus activates a dormant chart below the fold without scrolling it into view", async () => {
	const { top, far } = renderPage();
	await painted(top);
	screen.getByRole("application", { name: "Far chart" }).focus({ preventScroll: true });
	await waitFor(() => {
		expect(far.root).toHaveAttribute("data-state", "engaged");
	});
	// The focus handler activates synchronously; the paint lands on the next frame
	// once the resize observer reports the plot size.
	await painted(far);
});
