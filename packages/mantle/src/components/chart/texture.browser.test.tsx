import { render, waitFor } from "@testing-library/react";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { BarChart } from "../bar-chart/index.js";
import { createBarTexturePattern } from "./texture.js";

/**
 * Real-browser canvas-pixel tests for bar texture fills: pattern tiles must
 * rasterize with both the ground color and the tone-on-tone ink, and textured
 * bars must paint visibly differently from solid ones. happy-dom cannot
 * exercise this — it has no real 2D context or paint.
 */
const STYLE = `
:root {
	--color-chart-1: #3e6ff4;
	--color-chart-2: #167837;
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

/** A fresh working canvas + context, throwing (never silently skipping) when 2D is unavailable. */
const makeContext = (size: number): CanvasRenderingContext2D => {
	const canvas = document.createElement("canvas");
	canvas.width = size;
	canvas.height = size;
	const context = canvas.getContext("2d");
	if (context == null) {
		throw new Error("expected a real 2d context in browser mode");
	}
	return context;
};

/** Count the distinct opaque RGB colors in a filled region. */
const distinctOpaqueColors = (
	context: CanvasRenderingContext2D,
	x: number,
	y: number,
	width: number,
	height: number,
): Set<string> => {
	const image = context.getImageData(x, y, width, height);
	const colors = new Set<string>();
	for (let offset = 0; offset < image.data.length; offset += 4) {
		if ((image.data[offset + 3] ?? 0) === 255) {
			colors.add(`${image.data[offset]},${image.data[offset + 1]},${image.data[offset + 2]}`);
		}
	}
	return colors;
};

describe("createBarTexturePattern", () => {
	/** The red channel at one pixel of a pattern-filled canvas: black ink darkens the rgb(62, …) ground. */
	const redAt = (
		texture: "hatch" | "hatch-reverse" | "crosshatch" | "perpendicular" | "dots",
		x: number,
		y: number,
		orientation: "vertical" | "horizontal" = "vertical",
	) => {
		const context = makeContext(32);
		const pattern = createBarTexturePattern(context, {
			texture,
			color: "rgb(62, 111, 244)",
			ink: "rgb(0, 0, 0)",
			devicePixelRatio: 1,
			orientation,
		});
		context.fillStyle = pattern ?? "white";
		context.fillRect(0, 0, 32, 32);
		return context.getImageData(x, y, 1, 1).data[0] ?? 255;
	};

	test("rasterizes a two-tone tile: the series ground plus darker ink lines", () => {
		const context = makeContext(64);
		const pattern = createBarTexturePattern(context, {
			texture: "hatch",
			color: "rgb(62, 111, 244)",
			ink: "rgb(43, 78, 171)",
			devicePixelRatio: 1,
			orientation: "vertical",
		});
		expect(pattern).not.toBeNull();
		context.fillStyle = pattern ?? "black";
		context.fillRect(0, 0, 64, 64);
		const image = context.getImageData(0, 0, 64, 64);
		let ground = 0;
		let inked = 0;
		for (let offset = 0; offset < image.data.length; offset += 4) {
			const red = image.data[offset] ?? 0;
			if (red === 62) {
				ground += 1;
			} else if (red < 62) {
				inked += 1;
			}
		}
		// Ground dominates; the ink field is present but never louder than it.
		expect(ground).toBeGreaterThan(0);
		expect(inked).toBeGreaterThan(0);
		expect(inked).toBeLessThan(ground);
	});

	test("each family inks its own lattice: hatch /, its mirror \\, crosshatch both", () => {
		// With an 8px tile anchored at the origin, the 45° "/" family lies on
		// x + y ≡ 0 (mod 8) and the 135° "\" family on x − y ≡ 0 (mod 8). The
		// pixel centered at (1.5, 6.5) sits exactly on a "/" line and ~3.5px off
		// every "\" line; the pixel centered at (6.5, 6.5) is the reverse. Black
		// ink over the rgb(62, …) ground darkens the red channel; untouched
		// ground stays exactly 62.
		const ON_UP = [1, 6] as const;
		const ON_DOWN = [6, 6] as const;
		expect(redAt("hatch", ...ON_UP)).toBeLessThan(40);
		expect(redAt("hatch", ...ON_DOWN)).toBe(62);
		expect(redAt("hatch-reverse", ...ON_DOWN)).toBeLessThan(40);
		expect(redAt("hatch-reverse", ...ON_UP)).toBe(62);
		expect(redAt("crosshatch", ...ON_UP)).toBeLessThan(40);
		expect(redAt("crosshatch", ...ON_DOWN)).toBeLessThan(40);
	});

	test("perpendicular rungs run horizontally; dots sit on the offset quarter grid", () => {
		// The rung spans y ∈ [3, 5) of every 8px tile row; the dots sit at
		// (2, 2) and (6, 6) with radius 1.6. Sample pixel centers well inside
		// the ink and others well clear of it.
		expect(redAt("perpendicular", 3, 3)).toBeLessThan(40);
		expect(redAt("perpendicular", 3, 4)).toBeLessThan(40);
		expect(redAt("perpendicular", 3, 0)).toBe(62);
		expect(redAt("perpendicular", 3, 6)).toBe(62);
		expect(redAt("dots", 2, 2)).toBeLessThan(40);
		expect(redAt("dots", 6, 6)).toBeLessThan(40);
		expect(redAt("dots", 5, 2)).toBe(62);
		expect(redAt("dots", 2, 5)).toBe(62);
	});

	test("horizontal orientation turns the perpendicular rung vertical", () => {
		// Perpendicular rungs run across the bar's length, so horizontal bars get a
		// vertical rung: the ink now spans x ∈ [3, 5) of every tile column instead
		// of the y band it occupies for vertical bars.
		expect(redAt("perpendicular", 3, 3, "horizontal")).toBeLessThan(40);
		expect(redAt("perpendicular", 4, 3, "horizontal")).toBeLessThan(40);
		expect(redAt("perpendicular", 0, 3, "horizontal")).toBe(62);
		expect(redAt("perpendicular", 6, 3, "horizontal")).toBe(62);
	});
});

describe("textured legend keys", () => {
	test("legend keys wear the texture as CSS stripes", () => {
		const data = [
			{ month: "January", desktop: 186, mobile: 80 },
			{ month: "February", desktop: 305, mobile: 200 },
		];
		const { container } = render(
			<BarChart.Root data={data} xKey="month" aria-label="Visitors by month">
				<BarChart.Bar dataKey="desktop" label="Desktop" />
				<BarChart.Bar dataKey="mobile" label="Mobile" texture="hatch" />
				<BarChart.Legend />
			</BarChart.Root>,
		);
		const solid = container.querySelector('span[data-texture="solid"]');
		const textured = container.querySelector('span[data-texture="hatch"]');
		if (!(solid instanceof HTMLElement) || !(textured instanceof HTMLElement)) {
			throw new Error("expected solid and textured legend keys to render");
		}
		expect(getComputedStyle(solid).backgroundImage).toBe("none");
		expect(getComputedStyle(textured).backgroundImage).toContain("repeating-linear-gradient");
	});
});

describe("textured bar charts", () => {
	const data = [
		{ month: "January", desktop: 100, mobile: 100 },
		{ month: "February", desktop: 100, mobile: 100 },
		{ month: "March", desktop: 100, mobile: 100 },
	];

	const Chart = ({ mobileTexture }: { mobileTexture: "solid" | "hatch" }) => (
		<div style={{ width: 600, height: 300 }}>
			{/* animate=false so bars snap to full height: deterministic pixels. */}
			<BarChart.Root data={data} xKey="month" animate={false} aria-label="Visitors by month">
				<BarChart.Bar dataKey="desktop" label="Desktop" />
				<BarChart.Bar dataKey="mobile" label="Mobile" texture={mobileTexture} />
			</BarChart.Root>
		</div>
	);

	const chartCanvasContext = (container: HTMLElement) => {
		const canvas = container.querySelector("canvas");
		if (!(canvas instanceof HTMLCanvasElement)) {
			throw new Error("expected the chart canvas to render");
		}
		const context = canvas.getContext("2d");
		if (context == null) {
			throw new Error("expected the chart canvas to have a 2d context");
		}
		return { canvas, context };
	};

	/**
	 * Scan a mid-height device-pixel row (equal values put every bar's interior
	 * there, away from rounded corners and the baseline) and count the distinct
	 * opaque colors inside each bar run: 1 for a flat solid interior, ≥ 2 where
	 * texture ink crosses it.
	 */
	const barRunColorCounts = (
		context: CanvasRenderingContext2D,
		canvas: HTMLCanvasElement,
	): number[] => {
		const row = context.getImageData(0, Math.round(canvas.height / 2), canvas.width, 1);
		const runs: Array<{ start: number; end: number }> = [];
		let runStart: number | null = null;
		for (let x = 0; x < canvas.width; x++) {
			const opaque = (row.data[x * 4 + 3] ?? 0) === 255;
			if (opaque && runStart == null) {
				runStart = x;
			}
			if (!opaque && runStart != null) {
				runs.push({ start: runStart, end: x });
				runStart = null;
			}
		}
		if (runStart != null) {
			runs.push({ start: runStart, end: canvas.width });
		}
		return runs.map((run) => {
			const inset = 2;
			const width = run.end - run.start - inset * 2;
			return distinctOpaqueColors(
				context,
				run.start + inset,
				Math.round(canvas.height / 2) - 8,
				Math.max(1, width),
				16,
			).size;
		});
	};

	test("a textured series paints striped bars; a solid one stays flat", async () => {
		const { container } = render(<Chart mobileTexture="hatch" />);
		const { canvas, context } = chartCanvasContext(container);
		await waitFor(() => {
			expect(canvas.width).toBeGreaterThan(0);
		});
		await waitFor(() => {
			const colorCounts = barRunColorCounts(context, canvas);
			// Three categories × two series = six bars crossing the row,
			// alternating solid desktop / textured mobile.
			expect(colorCounts).toHaveLength(6);
			const solidCounts = colorCounts.filter((_, index) => index % 2 === 0);
			const texturedCounts = colorCounts.filter((_, index) => index % 2 === 1);
			expect(solidCounts).toEqual([1, 1, 1]);
			expect(Math.min(...texturedCounts)).toBeGreaterThan(1);
		});
	});

	test("changing texture on a mounted chart repaints the bars (paint-cache staleness)", async () => {
		// Regression guard for the engine's paint-cache staleness key: the color
		// is unchanged across this rerender, so if the key regressed to comparing
		// colors alone the cache would stay "fresh" and keep painting solid.
		const { container, rerender } = render(<Chart mobileTexture="solid" />);
		const { canvas, context } = chartCanvasContext(container);
		await waitFor(() => {
			expect(canvas.width).toBeGreaterThan(0);
		});
		await waitFor(() => {
			const colorCounts = barRunColorCounts(context, canvas);
			expect(colorCounts).toEqual([1, 1, 1, 1, 1, 1]);
		});
		rerender(<Chart mobileTexture="hatch" />);
		await waitFor(() => {
			const colorCounts = barRunColorCounts(context, canvas);
			expect(colorCounts).toHaveLength(6);
			expect(Math.min(...colorCounts.filter((_, index) => index % 2 === 1))).toBeGreaterThan(1);
		});
	});
});
