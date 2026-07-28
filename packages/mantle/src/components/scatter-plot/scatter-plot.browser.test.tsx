"use client";

import { render, waitFor } from "@testing-library/react";
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import { ScatterPlot } from "./scatter-plot.js";

/**
 * Real-browser tests for the scatter plot's paint paths — the 3D projection
 * (depth-sorted, camera-rotated) especially needs a real 2d context and real
 * layout. Tokens and structural layout CSS are inlined so the test stays
 * hermetic (mirrors bar-chart.browser.test.tsx).
 */
const STYLE = `
:root {
	--color-chart-1: #3e6ff4;
	--color-chart-2: #008138;
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
[data-slot="scatter-plot"] {
	display: flex;
	flex-direction: column;
	width: 100%;
	height: 100%;
}
[data-slot="scatter-plot-plot"] {
	position: relative;
	flex: 1;
	min-height: 0;
	width: 100%;
}
[data-slot="scatter-plot-plot"] > canvas,
[data-slot="scatter-plot-plot"] > [tabindex] {
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;
}
[data-slot="scatter-plot-tooltip"] {
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

const points3d = Array.from({ length: 60 }, (_, index) => ({
	x: Math.sin(index * 0.7) * 40 + 50,
	y: Math.cos(index * 1.3) * 30 + 50,
	depth: ((index * 37) % 100) + 1,
}));

const mustBeCanvas = (element: Element | null): HTMLCanvasElement => {
	if (element instanceof HTMLCanvasElement) {
		return element;
	}
	throw new Error("expected the chart canvas to render");
};

const mustBeOverlay = (element: Element | null): HTMLElement => {
	if (element instanceof HTMLElement) {
		return element;
	}
	throw new Error("expected the interaction overlay to render");
};

type InkPredicate = (red: number, green: number, blue: number, alpha: number) => boolean;

/** chart-1 (#3e6ff4) ink: blue-dominant and opaque. */
const isChart1Ink: InkPredicate = (red, green, blue, alpha) =>
	alpha > 200 && blue > 200 && blue > red + 80;

/** chart-2 (#008138) ink: green-dominant and opaque. */
const isChart2Ink: InkPredicate = (red, green, blue, alpha) =>
	alpha > 200 && green > 100 && green > red + 60 && green > blue + 40;

/**
 * The cube wireframe and axis lines, painted in --border-color-card-muted
 * (#e5e5e5) / --border-color-card (#d4d4d4): near-neutral light greys. Counting
 * them apart from the cloud is what makes "the frame fades with its dimension"
 * assertable — an any-color pixel count cannot tell frame from points.
 */
const isFrameInk: InkPredicate = (red, green, blue, alpha) =>
	alpha > 200 &&
	red > 190 &&
	red < 245 &&
	Math.abs(red - green) < 12 &&
	Math.abs(green - blue) < 12;

/**
 * Ink statistics for one color: how much of it was painted and the bounding box
 * it occupies, in CSS pixels relative to the plot. Self-locating, so no test has
 * to reconstruct the engine's projection to know where a point landed.
 */
type InkBox = {
	count: number;
	centerX: number;
	centerY: number;
	height: number;
	width: number;
};

const measureInk = (canvas: HTMLCanvasElement, predicate: InkPredicate): InkBox => {
	const context = canvas.getContext("2d");
	const cssWidth = canvas.getBoundingClientRect().width;
	const empty = {
		count: 0,
		centerX: Number.NaN,
		centerY: Number.NaN,
		height: 0,
		width: 0,
	} as const satisfies InkBox;
	if (context == null || canvas.width === 0 || canvas.height === 0 || cssWidth === 0) {
		return empty;
	}
	const image = context.getImageData(0, 0, canvas.width, canvas.height);
	let count = 0;
	let sumX = 0;
	let sumY = 0;
	let minX = Number.POSITIVE_INFINITY;
	let maxX = Number.NEGATIVE_INFINITY;
	let minY = Number.POSITIVE_INFINITY;
	let maxY = Number.NEGATIVE_INFINITY;
	for (let offset = 0; offset < image.data.length; offset += 4) {
		const red = image.data[offset] ?? 0;
		const green = image.data[offset + 1] ?? 0;
		const blue = image.data[offset + 2] ?? 0;
		const alpha = image.data[offset + 3] ?? 0;
		if (!predicate(red, green, blue, alpha)) {
			continue;
		}
		const pixel = offset / 4;
		const x = pixel % canvas.width;
		const y = Math.floor(pixel / canvas.width);
		count += 1;
		sumX += x;
		sumY += y;
		minX = Math.min(minX, x);
		maxX = Math.max(maxX, x);
		minY = Math.min(minY, y);
		maxY = Math.max(maxY, y);
	}
	if (count === 0) {
		return empty;
	}
	const devicePerCss = canvas.width / cssWidth;
	return {
		count,
		centerX: sumX / count / devicePerCss,
		centerY: sumY / count / devicePerCss,
		height: (maxY - minY) / devicePerCss,
		width: (maxX - minX) / devicePerCss,
	};
};

/** A full press+release at a point inside the interaction overlay. */
const pressAt = (overlay: HTMLElement, cssX: number, cssY: number): void => {
	const rect = overlay.getBoundingClientRect();
	const clientX = rect.left + cssX;
	const clientY = rect.top + cssY;
	overlay.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX, clientY }));
	overlay.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, clientX, clientY }));
};

const render3d = (dimensions: 1 | 2 | 3) =>
	render(
		<div style={{ width: 600, height: 400 }}>
			<ScatterPlot.Root
				data={points3d}
				xKey="x"
				zKey="depth"
				dimensions={dimensions}
				animate={false}
				aria-label="3D cloud"
			>
				<ScatterPlot.Point dataKey="y" label="Cluster" color="chart-1" />
			</ScatterPlot.Root>
		</div>,
	);

describe("ScatterPlot 3D painting", () => {
	test("paints the point cloud and the cube frame as distinct ink", async () => {
		const { container } = render3d(3);
		const canvas = mustBeCanvas(container.querySelector("canvas"));
		await waitFor(() => {
			// Counted by color: the wireframe and axis labels alone would satisfy an
			// any-color pixel count, so an empty cloud has to fail here.
			expect(measureInk(canvas, isChart1Ink).count).toBeGreaterThan(600);
			expect(measureInk(canvas, isFrameInk).count).toBeGreaterThan(200);
		});
		// 60 points spread over the cube: the cloud fills a large share of the plot
		// in both axes, so a collapsed or single-point projection fails.
		const cloud = measureInk(canvas, isChart1Ink);
		expect(cloud.width).toBeGreaterThan(150);
		expect(cloud.height).toBeGreaterThan(150);
	});

	test("dimensions collapses the cloud onto the x axis and fades the cube frame", async () => {
		const cube = render3d(3);
		const line = render3d(1);
		const cubeCanvas = mustBeCanvas(cube.container.querySelector("canvas"));
		const lineCanvas = mustBeCanvas(line.container.querySelector("canvas"));
		await waitFor(() => {
			expect(measureInk(cubeCanvas, isChart1Ink).count).toBeGreaterThan(600);
			expect(measureInk(lineCanvas, isChart1Ink).count).toBeGreaterThan(200);
		});
		const cubeCloud = measureInk(cubeCanvas, isChart1Ink);
		const lineCloud = measureInk(lineCanvas, isChart1Ink);
		// 1D holds every point on one horizontal line: the cloud keeps its width but
		// loses nearly all of its height.
		expect(lineCloud.height).toBeLessThan(cubeCloud.height / 4);
		expect(lineCloud.width).toBeGreaterThan(cubeCloud.width / 2);
		// The y and z frame edges belong to their dimensions, so the wireframe is
		// gone at 1D while the cube still draws it.
		expect(measureInk(lineCanvas, isFrameInk).count).toBeLessThan(
			measureInk(cubeCanvas, isFrameInk).count / 2,
		);
	});

	test("dragging the overlay rotates the camera and repaints a different frame", async () => {
		const { container } = render3d(3);
		const canvas = mustBeCanvas(container.querySelector("canvas"));
		const overlay = mustBeOverlay(container.querySelector('[role="application"]'));
		await waitFor(() => {
			expect(measureInk(canvas, isChart1Ink).count).toBeGreaterThan(600);
		});
		const context = canvas.getContext("2d");
		if (context == null) {
			throw new Error("expected a 2d context");
		}
		const before = context.getImageData(0, 0, canvas.width, canvas.height).data;
		const rect = overlay.getBoundingClientRect();
		const startX = rect.left + rect.width / 2;
		const startY = rect.top + rect.height / 2;
		overlay.dispatchEvent(
			new PointerEvent("pointerdown", { bubbles: true, clientX: startX, clientY: startY }),
		);
		overlay.dispatchEvent(
			new PointerEvent("pointermove", {
				bubbles: true,
				clientX: startX + 80,
				clientY: startY + 30,
			}),
		);
		overlay.dispatchEvent(
			new PointerEvent("pointerup", {
				bubbles: true,
				clientX: startX + 80,
				clientY: startY + 30,
			}),
		);
		await waitFor(() => {
			const after = context.getImageData(0, 0, canvas.width, canvas.height).data;
			let changed = 0;
			for (let offset = 0; offset < after.length; offset += 40) {
				if (after[offset] !== before[offset]) {
					changed += 1;
				}
			}
			expect(changed).toBeGreaterThan(100);
		});
	});
});

describe("ScatterPlot pointer hit testing", () => {
	// One point per series, far apart, so each color's ink locates exactly one
	// point and the 24px hit tolerance can be probed from a known distance.
	const pairs = [
		{ latency: 10, alpha: 900, beta: null },
		{ latency: 90, alpha: null, beta: 100 },
	];

	const renderPairs = (
		onDatumActivate: (event: { index: number; dataKey: string | null }) => void,
	) =>
		render(
			<div style={{ width: 600, height: 400 }}>
				<ScatterPlot.Root
					data={pairs}
					xKey="latency"
					animate={false}
					aria-label="Latency by region"
					onDatumActivate={onDatumActivate}
				>
					<ScatterPlot.Point dataKey="alpha" label="Alpha" color="chart-1" />
					<ScatterPlot.Point dataKey="beta" label="Beta" color="chart-2" />
				</ScatterPlot.Root>
			</div>,
		);

	test("a press names the series of the point it hit", async () => {
		const onDatumActivate = vi.fn<(event: { index: number; dataKey: string | null }) => void>();
		const { container } = renderPairs(onDatumActivate);
		const canvas = mustBeCanvas(container.querySelector("canvas"));
		const overlay = mustBeOverlay(container.querySelector('[role="application"]'));
		await waitFor(() => {
			expect(measureInk(canvas, isChart1Ink).count).toBeGreaterThan(10);
			expect(measureInk(canvas, isChart2Ink).count).toBeGreaterThan(10);
		});
		const alpha = measureInk(canvas, isChart1Ink);
		const beta = measureInk(canvas, isChart2Ink);

		pressAt(overlay, alpha.centerX, alpha.centerY);
		expect(onDatumActivate).toHaveBeenCalledTimes(1);
		expect(onDatumActivate).toHaveBeenLastCalledWith(
			expect.objectContaining({ index: 0, dataKey: "alpha" }),
		);

		pressAt(overlay, beta.centerX, beta.centerY);
		expect(onDatumActivate).toHaveBeenCalledTimes(2);
		expect(onDatumActivate).toHaveBeenLastCalledWith(
			expect.objectContaining({ index: 1, dataKey: "beta" }),
		);
	});

	test("the hit tolerance reaches past the dot but not across the plot", async () => {
		const onDatumActivate = vi.fn<(event: { index: number; dataKey: string | null }) => void>();
		const { container } = renderPairs(onDatumActivate);
		const canvas = mustBeCanvas(container.querySelector("canvas"));
		const overlay = mustBeOverlay(container.querySelector('[role="application"]'));
		await waitFor(() => {
			expect(measureInk(canvas, isChart1Ink).count).toBeGreaterThan(10);
		});
		const alpha = measureInk(canvas, isChart1Ink);

		// ~14px away: outside the ~5px dot, inside the documented 24px tolerance.
		pressAt(overlay, alpha.centerX + 10, alpha.centerY + 10);
		expect(onDatumActivate).toHaveBeenCalledTimes(1);
		expect(onDatumActivate).toHaveBeenLastCalledWith(
			expect.objectContaining({ index: 0, dataKey: "alpha" }),
		);

		// ~42px away, and nowhere near the other series' point: no activation.
		pressAt(overlay, alpha.centerX + 30, alpha.centerY + 30);
		expect(onDatumActivate).toHaveBeenCalledTimes(1);
	});
});
