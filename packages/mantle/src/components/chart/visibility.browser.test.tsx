"use client";

import { render, screen, waitFor } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, expect, test } from "vitest";
import { CanvasLineChartRoot } from "../../test-utils/canvas-chart-roots.js";
import { LineChart } from "../line-chart/index.js";

/**
 * Real-browser visibility tests: a chart activates (builds its paint surface
 * and paints) once an `IntersectionObserver` reports it within a viewport of
 * the visible area, and a canvas chart releases its canvas three viewports
 * away. Both need real layout, a real observer, and real scrolling. Motion
 * plays only on screen, which needs the real order of the band reports.
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

/** The surface a chart paints on. A canvas holds a bitmap the far band releases. */
type Surface = "svg" | "canvas";

const chart = (name: string, surface: Surface = "svg") => {
	const Root = surface === "canvas" ? CanvasLineChartRoot : LineChart.Root;
	return (
		<div style={{ width: 400, height: 200 }}>
			<Root data={data} xKey="time" animate={false} aria-label={name}>
				<LineChart.Line dataKey="p50" label="p50" color="blue" />
			</Root>
		</div>
	);
};

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

/** The chart's paint surface, or `null` while the chart is dormant. */
const surfaceOf = ({ plot }: Chart): Element | null =>
	plot.querySelector('[data-slot="line-chart-svg"], [data-slot="line-chart-canvas"]');

/** The chart's canvas, or `null` while the chart is dormant. */
const canvasOf = ({ plot }: Chart): HTMLCanvasElement | null => {
	const canvas = plot.querySelector("canvas");
	return canvas instanceof HTMLCanvasElement ? canvas : null;
};

/** The backing-store width a painted canvas holds for its plot. */
const paintedWidth = ({ plot }: Chart): number => Math.round(plot.clientWidth * devicePixelRatio);

/** Whether the chart has painted: a canvas sized to its plot, or an SVG with a line path. */
const isPainted = (chart: Chart): boolean => {
	const canvas = canvasOf(chart);
	if (canvas != null) {
		return canvas.width === paintedWidth(chart);
	}
	return chart.plot.querySelector('[data-slot="line-chart-svg"] path[d]') != null;
};

/**
 * A chart in view at the top, a spacer four viewports tall, and a chart past
 * it: beyond the near band (one viewport) and the far band (three).
 */
const renderPage = (surface: Surface = "svg") => {
	render(
		<>
			{chart("Top chart", surface)}
			<div style={{ height: window.innerHeight * 4 }} />
			{chart("Far chart", surface)}
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
		expect(isPainted(chart)).toBe(true);
	});

test("a chart below the fold stays a shell while the chart in view activates and paints", async () => {
	const { top, far } = renderPage();
	await painted(top);
	// A chart that activates regardless of visibility holds a surface here.
	expect(far.root).toHaveAttribute("data-state", "dormant");
	expect(surfaceOf(far)).toBeNull();
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
	const { far } = renderPage("canvas");
	scrollToBottom();
	await painted(far);

	window.scrollTo(0, 0);
	await waitFor(() => {
		expect(canvasOf(far)?.width).toBe(0);
	});

	scrollToBottom();
	await painted(far);
});

test("beforeprint activates and paints a dormant canvas chart synchronously and afterprint releases it", async () => {
	const { top, far } = renderPage("canvas");
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
	expect(surfaceOf(lone)).toBeNull();

	window.dispatchEvent(new Event("beforeprint"));
	expect(isPainted(lone)).toBe(true);
	window.dispatchEvent(new Event("afterprint"));
});

test("beforeprint paints the tick labels of a dormant chart at full alpha", async () => {
	render(
		<>
			<div style={{ height: window.innerHeight * 4 }} />
			<div style={{ width: 400, height: 200 }}>
				<LineChart.Root data={data} xKey="time" aria-label="Lone chart">
					<LineChart.Line dataKey="p50" label="p50" color="blue" />
					<LineChart.YAxis />
				</LineChart.Root>
			</div>
		</>,
	);
	const lone = chartNamed("Lone chart");
	await waitFor(() => {
		expect(screen.getByRole("application", { name: "Lone chart" })).toBeInTheDocument();
	});
	expect(surfaceOf(lone)).toBeNull();

	window.dispatchEvent(new Event("beforeprint"));

	const labels = [...(lone.plot.querySelector("svg")?.querySelectorAll("text") ?? [])];
	expect(labels.length).toBeGreaterThan(0);
	// The print is this chart's first paint. A label that fades in is at its
	// first step there, and the SVG surface writes no opacity for an alpha of 1.
	expect(labels.filter((label) => label.style.opacity !== "")).toEqual([]);
	window.dispatchEvent(new Event("afterprint"));
});

const nextData = [
	{ time: new Date("2026-07-18T10:00:00Z"), p50: 320 },
	{ time: new Date("2026-07-18T10:01:00Z"), p50: 150 },
	{ time: new Date("2026-07-18T10:02:00Z"), p50: 280 },
];

/**
 * A chart with motion on, above one with motion off that holds the same data
 * at the same size. The second one always shows the line the first one ends
 * on. `offset` is the space above the pair.
 */
const chartPair = ({ rows, offset }: { rows: typeof data; offset: number }) => (
	<>
		<div style={{ height: offset }} />
		{[
			{ name: "Moving chart", animate: true },
			{ name: "Settled chart", animate: false },
		].map(({ name, animate }) => (
			<div key={name} style={{ width: 400, height: 200 }}>
				<LineChart.Root data={rows} xKey="time" animate={animate} aria-label={name}>
					<LineChart.Line dataKey="p50" label="p50" color="blue" />
				</LineChart.Root>
			</div>
		))}
	</>
);

/** The `d` of the chart's line, or `null` before the first paint. */
const linePath = ({ plot }: Chart): string | null =>
	plot.querySelector('[data-slot="line-chart-svg"] path')?.getAttribute("d") ?? null;

/** Resolves after the next animation frame. The engines asked first, so they commit in it first. */
const nextFrame = (): Promise<void> =>
	new Promise((resolve) => {
		requestAnimationFrame(() => resolve());
	});

/** Render the pair, give both charts new data once they painted, and wait one frame. */
const updatePair = async (offset: number) => {
	const { rerender } = render(chartPair({ rows: data, offset }));
	const moving = chartNamed("Moving chart");
	const settled = chartNamed("Settled chart");
	await painted(moving);
	await painted(settled);
	const before = linePath(settled);
	rerender(chartPair({ rows: nextData, offset }));
	await nextFrame();
	// Guards the comparison below: the settled chart must hold the new line by now.
	expect(linePath(settled)).not.toBe(before);
	return { moving, settled };
};

test("a chart near the viewport but off screen paints new data settled on the first frame", async () => {
	// One and a quarter viewports down: inside the near band, under the fold.
	const { moving, settled } = await updatePair(window.innerHeight * 1.25);
	expect(linePath(moving)).toBe(linePath(settled));
});

test("a chart on screen glides to new data", async () => {
	const { moving, settled } = await updatePair(0);
	expect(linePath(moving)).not.toBe(linePath(settled));
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
