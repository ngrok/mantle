"use client";

import { render, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterAll, beforeAll, expect, test } from "vitest";
import { page } from "vitest/browser";
import {
	CanvasAreaChartRoot,
	CanvasBarChartRoot,
	CanvasLineChartRoot,
} from "../../test-utils/canvas-chart-roots.js";
import { AreaChart, type AreaChartRootProps } from "../area-chart/index.js";
import { BarChart, type BarChartRootProps } from "../bar-chart/index.js";
import { LineChart, type LineChartRootProps } from "../line-chart/index.js";
import type { ChartDatum } from "./types.js";

/**
 * The SVG and canvas backends draw one geometry, so the same scene must give
 * the same pixels through both. Bar, Line, and Area ship SVG only; the canvas
 * here is the reference, the browser's own 2D rasterizer. Each test paints a scene twice, takes a real
 * screenshot of each plot, and counts the pixels that differ. The canvas
 * pixel tests elsewhere pin the geometry itself, so this file extends them to
 * the SVG backend.
 *
 * Browser tests load no Tailwind build, so the tokens and the chart's
 * structural layout are inlined here.
 */
const STYLE = `
:root {
	--color-chart-1: #3e6ff4;
	--color-chart-2: #008138;
	--color-chart-3: #f6339a;
	--color-chart-other: #737373;
	--border-color-card-muted: #e5e5e5;
	--border-color-card: #a3a3a3;
	--text-color-muted: #525252;
	--color-neutral-500: #737373;
	--background-color-card: #ffffff;
	font-family: Arial, sans-serif;
}
body { background: #ffffff; margin: 0; }
.sr-only {
	position: absolute;
	width: 1px;
	height: 1px;
	overflow: hidden;
	clip: rect(0, 0, 0, 0);
}
.parity-frame { width: 360px; height: 180px; background: #ffffff; }
[data-slot$="-chart"] {
	display: flex;
	flex-direction: column;
	width: 100%;
	height: 100%;
}
[data-slot$="-chart-plot"] {
	position: relative;
	flex: 1;
	min-height: 0;
	width: 100%;
}
[data-slot$="-chart-plot"] > [tabindex] {
	position: absolute;
	inset: 0;
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

/**
 * A pixel whose largest channel differs by more than this is a mismatch. An
 * area's 10% wash sits about 25 levels off the white ground, so 8 sees it.
 */
const CHANNEL_TOLERANCE = 8;

/** The backend a scene paints through. */
type Surface = "svg" | "canvas";

type Scene = (surface: Surface) => ReactNode;

const BarRoot = <TDatum extends ChartDatum>({
	surface,
	...props
}: BarChartRootProps<TDatum> & { surface: Surface }) =>
	surface === "svg" ? <BarChart.Root {...props} /> : <CanvasBarChartRoot {...props} />;

const LineRoot = <TDatum extends ChartDatum>({
	surface,
	...props
}: LineChartRootProps<TDatum> & { surface: Surface }) =>
	surface === "svg" ? <LineChart.Root {...props} /> : <CanvasLineChartRoot {...props} />;

const AreaRoot = <TDatum extends ChartDatum>({
	surface,
	...props
}: AreaChartRootProps<TDatum> & { surface: Surface }) =>
	surface === "svg" ? <AreaChart.Root {...props} /> : <CanvasAreaChartRoot {...props} />;

/** Decode a base64 PNG screenshot into its pixels. */
const pixelsOf = async (base64: string): Promise<ImageData> => {
	const response = await fetch(`data:image/png;base64,${base64}`);
	const bitmap = await createImageBitmap(await response.blob());
	const canvas = document.createElement("canvas");
	canvas.width = bitmap.width;
	canvas.height = bitmap.height;
	const context = canvas.getContext("2d");
	if (context == null) {
		throw new Error("expected a 2D context to decode the screenshot");
	}
	context.drawImage(bitmap, 0, 0);
	return context.getImageData(0, 0, bitmap.width, bitmap.height);
};

/** The share of pixels that differ between two screenshots of the same size. */
const mismatchShare = (a: ImageData, b: ImageData): number => {
	expect([b.width, b.height]).toEqual([a.width, a.height]);
	let mismatched = 0;
	for (let offset = 0; offset < a.data.length; offset += 4) {
		const difference = Math.max(
			Math.abs((a.data[offset] ?? 0) - (b.data[offset] ?? 0)),
			Math.abs((a.data[offset + 1] ?? 0) - (b.data[offset + 1] ?? 0)),
			Math.abs((a.data[offset + 2] ?? 0) - (b.data[offset + 2] ?? 0)),
		);
		if (difference > CHANNEL_TOLERANCE) {
			mismatched += 1;
		}
	}
	return mismatched / (a.width * a.height);
};

/** The share of pixels that are not the white ground, so a blank pair cannot pass. */
const inkShare = (image: ImageData): number => {
	let ink = 0;
	for (let offset = 0; offset < image.data.length; offset += 4) {
		if (
			(image.data[offset] ?? 255) < 200 ||
			(image.data[offset + 1] ?? 255) < 200 ||
			(image.data[offset + 2] ?? 255) < 200
		) {
			ink += 1;
		}
	}
	return ink / (image.width * image.height);
};

/**
 * The box around the label ink: neutral gray pixels darker than the baseline.
 * Bars are hued and the grid is lighter, so only text lands in it.
 */
const labelBounds = (image: ImageData) => {
	const bounds = { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity };
	for (let y = 0; y < image.height; y++) {
		for (let x = 0; x < image.width; x++) {
			const offset = (y * image.width + x) * 4;
			const red = image.data[offset] ?? 255;
			const green = image.data[offset + 1] ?? 255;
			const blue = image.data[offset + 2] ?? 255;
			if (red < 140 && Math.abs(red - green) < 12 && Math.abs(green - blue) < 12) {
				bounds.left = Math.min(bounds.left, x);
				bounds.top = Math.min(bounds.top, y);
				bounds.right = Math.max(bounds.right, x);
				bounds.bottom = Math.max(bounds.bottom, y);
			}
		}
	}
	return bounds;
};

/** Paint one scene through both backends and return each plot's pixels. */
const paintBoth = async (scene: Scene): Promise<Record<Surface, ImageData>> => {
	const { container } = render(
		<>
			<div className="parity-frame" data-surface="canvas">
				{scene("canvas")}
			</div>
			<div className="parity-frame" data-surface="svg">
				{scene("svg")}
			</div>
		</>,
	);
	const plotOf = (surface: Surface): HTMLElement => {
		const plot = container.querySelector(`[data-surface="${surface}"] [data-slot$="-chart-plot"]`);
		if (!(plot instanceof HTMLElement)) {
			throw new Error(`expected the ${surface} plot to render`);
		}
		return plot;
	};
	await waitFor(() => {
		const canvas = plotOf("canvas").querySelector("canvas");
		expect(canvas?.width).toBe(Math.round(plotOf("canvas").clientWidth * devicePixelRatio));
		expect(plotOf("svg").querySelector("svg path[d]")).not.toBeNull();
	});
	const shoot = async (surface: Surface) =>
		pixelsOf(await page.screenshot({ element: plotOf(surface), save: false }));
	return { canvas: await shoot("canvas"), svg: await shoot("svg") };
};

const categories = [
	{ month: "Jan", desktop: 186, mobile: 80, tablet: 40 },
	{ month: "Feb", desktop: 305, mobile: 200, tablet: 90 },
	{ month: "Mar", desktop: 237, mobile: 120, tablet: 60 },
	{ month: "Apr", desktop: 73, mobile: 190, tablet: 110 },
	{ month: "May", desktop: 209, mobile: 130, tablet: 70 },
];

const series = Array.from({ length: 24 }, (_unused, index) => ({
	x: index,
	a: 40 + Math.round(30 * Math.sin(index / 3)),
	b: index === 9 ? null : 20 + Math.round(15 * Math.cos(index / 4)),
}));

const dense = Array.from({ length: 4000 }, (_unused, index) => ({
	x: index,
	value: 50 + 40 * Math.sin(index / 40) + ((index * 7919) % 13) - 6,
}));

/**
 * Each scene's largest mismatch share. Marks match to within antialiasing.
 * Text rasterizes a little differently on a canvas and in SVG, so the scene
 * with axis labels allows more.
 */
const scenes: Array<{ name: string; scene: Scene; tolerance: number }> = [
	{
		name: "grouped vertical bars",
		tolerance: 0.002,
		scene: (surface) => (
			<BarRoot
				surface={surface}
				data={categories}
				xKey="month"
				animate={false}
				aria-label="Grouped"
			>
				<BarChart.Grid />
				<BarChart.Bar dataKey="desktop" label="Desktop" />
				<BarChart.Bar dataKey="mobile" label="Mobile" />
			</BarRoot>
		),
	},
	{
		name: "stacked bars with a reference line",
		tolerance: 0.002,
		scene: (surface) => (
			<BarRoot
				surface={surface}
				data={categories}
				xKey="month"
				stacked
				animate={false}
				aria-label="Stacked"
			>
				<BarChart.Bar dataKey="desktop" label="Desktop" />
				<BarChart.Bar dataKey="mobile" label="Mobile" />
				<BarChart.Bar dataKey="tablet" label="Tablet" />
				<BarChart.ReferenceLine y={300} />
			</BarRoot>
		),
	},
	{
		name: "horizontal bars",
		tolerance: 0.002,
		scene: (surface) => (
			<BarRoot
				surface={surface}
				data={categories}
				xKey="month"
				orientation="horizontal"
				animate={false}
				aria-label="Horizontal"
			>
				<BarChart.Bar dataKey="desktop" label="Desktop" />
				<BarChart.Bar dataKey="mobile" label="Mobile" />
			</BarRoot>
		),
	},
	{
		name: "monotone lines with markers and a gap",
		tolerance: 0.002,
		scene: (surface) => (
			<LineRoot surface={surface} data={series} xKey="x" animate={false} aria-label="Lines">
				<LineChart.Grid />
				<LineChart.Line dataKey="a" label="A" curve="monotone" markers />
				<LineChart.Line dataKey="b" label="B" curve="step" />
			</LineRoot>
		),
	},
	{
		name: "stacked areas",
		tolerance: 0.002,
		scene: (surface) => (
			<AreaRoot
				surface={surface}
				data={series.map((row) => ({ ...row, b: row.b ?? 0 }))}
				xKey="x"
				stacked
				animate={false}
				aria-label="Areas"
			>
				<AreaChart.Area dataKey="a" label="A" />
				<AreaChart.Area dataKey="b" label="B" />
			</AreaRoot>
		),
	},
	{
		name: "a decimated line",
		tolerance: 0.002,
		scene: (surface) => (
			<LineRoot surface={surface} data={dense} xKey="x" animate={false} aria-label="Dense">
				<LineChart.Line dataKey="value" label="Value" />
			</LineRoot>
		),
	},
	{
		name: "axes and grid labels",
		tolerance: 0.03,
		scene: (surface) => (
			<BarRoot surface={surface} data={categories} xKey="month" animate={false} aria-label="Axes">
				<BarChart.Grid />
				<BarChart.XAxis />
				<BarChart.YAxis />
				<BarChart.Bar dataKey="desktop" label="Desktop" />
			</BarRoot>
		),
	},
];

test("axis labels sit in the same box through both backends", async () => {
	const axes = scenes.find((entry) => entry.name === "axes and grid labels");
	if (axes == null) {
		throw new Error("expected the axes scene");
	}
	const painted = await paintBoth(axes.scene);
	const canvas = labelBounds(painted.canvas);
	const svg = labelBounds(painted.svg);
	// Why a box: a label one baseline off moves a few hundred pixels, which a
	// share of the whole plot cannot tell from antialiasing.
	expect(Number.isFinite(canvas.left)).toBe(true);
	for (const edge of ["left", "top", "right", "bottom"] as const) {
		expect(Math.abs(svg[edge] - canvas[edge])).toBeLessThanOrEqual(1);
	}
});

test.each(scenes)(
	"$name paints the same pixels through both backends",
	async ({ scene, tolerance }) => {
		const painted = await paintBoth(scene);
		// A pair of blank plots would match; each scene inks a real share of its plot.
		expect(inkShare(painted.canvas)).toBeGreaterThan(0.02);
		expect(inkShare(painted.svg)).toBeGreaterThan(0.02);
		expect(mismatchShare(painted.canvas, painted.svg)).toBeLessThan(tolerance);
	},
);
