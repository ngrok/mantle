import { render, waitFor } from "@testing-library/react";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { BarChart } from "../bar-chart/index.js";
import { paintTextureTile, TEXTURE_TILE_SIZE } from "./texture.js";
import type { BarOrientation, BarTexture } from "./types.js";

/**
 * Real-browser tests for bar texture fills: each tile must paint both the
 * ground color and the tone-on-tone ink, and a textured bar must fill with its
 * SVG `<pattern>`. The tile tests read canvas pixels, which happy-dom cannot
 * paint.
 */
const STYLE = `
:root {
	--color-chart-blue: #3e6ff4;
	--color-chart-emerald: #167837;
	--color-chart-neutral: #737373;
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

/**
 * Every value the tile painters cover, typed off the option itself rather than
 * hand-copied — a narrower copy would stay assignable and cover nothing new.
 * Pixel coverage for a ninth value is still on the author: the probes below name
 * their textures explicitly.
 */
type NonSolidTexture = Exclude<BarTexture, "solid">;

/**
 * The red channel of one 8×8 texture tile, indexed `[y][x]`: black ink darkens
 * the rgb(62, …) ground, and untouched ground reads exactly 62.
 */
const tileReds = (
	texture: NonSolidTexture,
	orientation: BarOrientation = "vertical",
): number[][] => {
	const size = TEXTURE_TILE_SIZE;
	const context = makeContext(size);
	paintTextureTile(context, {
		texture,
		ground: "rgb(62, 111, 244)",
		ink: "rgb(0, 0, 0)",
		orientation,
	});
	const image = context.getImageData(0, 0, size, size);
	return Array.from({ length: size }, (_, y) =>
		Array.from({ length: size }, (_, x) => image.data[(y * size + x) * 4] ?? 255),
	);
};

/** Whether one sample carries ink, at the threshold the lattice tests already read. */
const isInked = (red: number): boolean => red < 40;

/**
 * The tile rows whose every pixel carries ink. A rung is a full-width band, so
 * it lands here; a diagonal family and a dot field never do.
 */
const inkedRows = (tile: readonly number[][]): number[] =>
	tile.flatMap((row, y) => (row.every(isInked) ? [y] : []));

/** The quarter turn of {@link inkedRows}: the fully inked columns. */
const inkedColumns = (tile: readonly number[][]): number[] =>
	(tile[0] ?? []).flatMap((_, x) => (tile.every((row) => isInked(row[x] ?? 255)) ? [x] : []));

/**
 * Mean ink coverage of a texture's tile: black ink on a white ground, weighted
 * per pixel so a half-covered edge counts as half. The tile repeats, so one
 * tile's coverage is the bar's. This is the loudness contract's unit — a
 * textured bar may never read darker than its siblings.
 */
const inkCoverage = (texture: NonSolidTexture, devicePixelRatio: number): number => {
	const span = TEXTURE_TILE_SIZE * devicePixelRatio;
	const context = makeContext(span);
	// Paint at device resolution, as an SVG `<pattern>` rasterizes on a retina
	// screen; at 1x the coarse grid drops ink from the strokes and the dots.
	context.scale(devicePixelRatio, devicePixelRatio);
	paintTextureTile(context, {
		texture,
		ground: "rgb(255, 255, 255)",
		ink: "rgb(0, 0, 0)",
		orientation: "vertical",
	});
	const image = context.getImageData(0, 0, span, span);
	let ink = 0;
	for (let offset = 0; offset < image.data.length; offset += 4) {
		ink += (255 - (image.data[offset] ?? 255)) / 255;
	}
	return ink / (image.data.length / 4);
};

describe("texture tiles", () => {
	/** The red channel at one pixel of a tile. */
	const redAt = (texture: NonSolidTexture, x: number, y: number) =>
		tileReds(texture)[y]?.[x] ?? 255;

	test("paints a two-tone tile: a light ground under the series-color ink", () => {
		const size = TEXTURE_TILE_SIZE;
		const context = makeContext(size);
		paintTextureTile(context, {
			texture: "hatch",
			ground: "rgb(62, 111, 244)",
			ink: "rgb(43, 78, 171)",
			orientation: "vertical",
		});
		const image = context.getImageData(0, 0, size, size);
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

	test("the two rung textures run at right angles, and each flips with the bars", () => {
		// The rung spans [3, 5) of the tile, so a horizontal rung shows up as two
		// fully inked rows and a vertical one as two fully inked columns. Naming
		// both textures at both orientations is what pins the direction: a test
		// that reads one axis passes with the pair swapped.
		const BAND = [3, 4];
		// Vertical bars: "perpendicular" runs across the length, "parallel" along it.
		expect(inkedRows(tileReds("perpendicular", "vertical"))).toEqual(BAND);
		expect(inkedColumns(tileReds("perpendicular", "vertical"))).toEqual([]);
		expect(inkedColumns(tileReds("parallel", "vertical"))).toEqual(BAND);
		expect(inkedRows(tileReds("parallel", "vertical"))).toEqual([]);
		// Horizontal bars rotate the pair a quarter turn, so the axes trade places.
		expect(inkedColumns(tileReds("perpendicular", "horizontal"))).toEqual(BAND);
		expect(inkedRows(tileReds("perpendicular", "horizontal"))).toEqual([]);
		expect(inkedRows(tileReds("parallel", "horizontal"))).toEqual(BAND);
		expect(inkedColumns(tileReds("parallel", "horizontal"))).toEqual([]);
	});

	test('"parallel" is the same rung as "perpendicular", rotated a quarter turn', () => {
		// The complement contract, stated as tile equality: one texture at either
		// orientation is the other at the opposite one, ink for ink. Equality also
		// pins the shared rung width, so the twin cannot drift louder or lighter.
		expect(tileReds("parallel", "vertical")).toEqual(tileReds("perpendicular", "horizontal"));
		expect(tileReds("parallel", "horizontal")).toEqual(tileReds("perpendicular", "vertical"));
		// The pair never resolves the same way at one orientation, which is what a
		// dropped or un-inverted orientation branch would do.
		expect(tileReds("parallel", "vertical")).not.toEqual(tileReds("perpendicular", "vertical"));
	});

	test('"grid" inks both rung families and crosses at the tile center', () => {
		// The orthogonal lattice: one full-width row band and one full-height
		// column band, which no single-rung texture can show. The corners stay bare
		// ground — the 45° family passes through (0, 0), so a grid routed into the
		// crosshatch branch would ink there.
		const tile = tileReds("grid", "vertical");
		expect(inkedRows(tile)).toEqual([3, 4]);
		expect(inkedColumns(tile)).toEqual([3, 4]);
		expect(tile[0]?.[0]).toBe(62);
		expect(tile[6]?.[6]).toBe(62);
		// Where the two families overlap the ink stacks, so the crossing reads
		// darker than either rung alone.
		expect(tile[3]?.[3] ?? 255).toBeLessThan(tile[3]?.[0] ?? 0);
		expect(tile[3]?.[3] ?? 255).toBeLessThan(tile[0]?.[3] ?? 0);
	});

	test('"grid" is direction-free: the lattice does not rotate with the bars', () => {
		// Both families ink either way, so a runtime orientation change leaves the
		// tile alone. Threading orientation into the lattice would turn it.
		expect(tileReds("grid", "horizontal")).toEqual(tileReds("grid", "vertical"));
	});

	test("the new textures ink inside the loudness band the shipped ones set", () => {
		// Loudness is an ink-coverage contract: a textured bar may never read
		// darker than its siblings. The band comes from the five textures that
		// shipped first, measured through the real tile painters rather than
		// recomputed from constants. Sample at device pixel ratio 2. At 1x the diagonal strokes
		// and the dot field both lose ink to the coarse device grid, so the floor
		// drops to about 22.5% — low enough to admit a lattice that reads too light
		// at real resolutions.
		const shipped = (
			["hatch", "hatch-reverse", "crosshatch", "perpendicular", "dots"] as const
		).map((texture) => inkCoverage(texture, 2));
		const floor = Math.min(...shipped);
		const ceiling = Math.max(...shipped);
		for (const texture of ["parallel", "grid"] as const) {
			const coverage = inkCoverage(texture, 2);
			expect(coverage).toBeGreaterThanOrEqual(floor);
			expect(coverage).toBeLessThanOrEqual(ceiling);
		}
	});
});

/**
 * Every `BarTexture` value, keyed by itself. The mapped key type makes a missing
 * or misspelled value a compile error, so a ninth texture cannot ship without a
 * chip of its own. `Object.values` reads the list back typed and in declaration
 * order.
 */
const EVERY_TEXTURE = {
	solid: "solid",
	hatch: "hatch",
	"hatch-reverse": "hatch-reverse",
	crosshatch: "crosshatch",
	perpendicular: "perpendicular",
	parallel: "parallel",
	grid: "grid",
	dots: "dots",
} as const satisfies { [Texture in BarTexture]: Texture };

describe("textured legend keys", () => {
	/** The computed paint of one legend chip. */
	type ChipPaint = { backgroundImage: string; backgroundColor: string };

	/**
	 * Render one bar per texture and read every legend chip's computed paint.
	 * Every series shares one color on purpose: one ink across all eight
	 * chips leaves the stripe geometry as the only thing that can differ.
	 */
	const chipPaint = (orientation: BarOrientation): Map<BarTexture, ChipPaint> => {
		const textures = Object.values(EVERY_TEXTURE);
		const data = [
			{
				month: "January",
				...Object.fromEntries(textures.map((texture, index) => [texture, 10 * (index + 1)])),
			},
		];
		const { container, unmount } = render(
			<BarChart.Root
				data={data}
				xKey="month"
				orientation={orientation}
				aria-label="Visitors by month"
			>
				{textures.map((texture) => (
					<BarChart.Bar
						key={texture}
						dataKey={texture}
						label={texture}
						texture={texture}
						color="blue"
					/>
				))}
				<BarChart.Legend />
			</BarChart.Root>,
		);
		const paint = new Map<BarTexture, ChipPaint>();
		for (const texture of textures) {
			const swatch = container.querySelector(`span[data-texture="${texture}"]`);
			if (swatch instanceof HTMLElement) {
				const computed = getComputedStyle(swatch);
				paint.set(texture, {
					backgroundColor: computed.backgroundColor,
					backgroundImage: computed.backgroundImage,
				});
			}
		}
		unmount();
		return paint;
	};

	/** One chip's paint, failing loudly when that key never rendered. */
	const chipOf = (paint: Map<BarTexture, ChipPaint>, texture: BarTexture): ChipPaint => {
		const chip = paint.get(texture);
		if (chip == null) {
			throw new Error(`expected a legend key for the "${texture}" texture`);
		}
		return chip;
	};

	test("legend keys wear the texture as CSS stripes", () => {
		const data = [
			{ month: "January", desktop: 186, mobile: 80 },
			{ month: "February", desktop: 305, mobile: 200 },
		];
		const { container } = render(
			<BarChart.Root data={data} xKey="month" aria-label="Visitors by month">
				<BarChart.Bar dataKey="desktop" label="Desktop" color="blue" />
				<BarChart.Bar dataKey="mobile" label="Mobile" texture="hatch" color="emerald" />
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

	test("every texture paints its own chip, so no value can fall through to another", () => {
		// The chip layers are a lookup keyed by the union. Its predecessor was an
		// if-chain ending in the dot gradient, so an unhandled value rendered as
		// dots — a wrong chip that looks deliberate. All eight series share one
		// series color here, so two equal backgrounds can only mean two values
		// reading one entry.
		const paint = chipPaint("vertical");
		expect(paint.size).toBe(Object.keys(EVERY_TEXTURE).length);
		const backgrounds = [...paint.values()].map((chip) => chip.backgroundImage);
		expect(new Set(backgrounds).size).toBe(backgrounds.length);
		expect(chipOf(paint, "solid").backgroundImage).toBe("none");
		// A solid chip wears the series color. Every textured chip wears one light
		// tint of it under the stripes — a chip that lost its ground floats over nothing.
		const solidGround = chipOf(paint, "solid").backgroundColor;
		const texturedGrounds = new Set(
			[...paint.entries()].flatMap(([texture, chip]) =>
				texture === "solid" ? [] : [chip.backgroundColor],
			),
		);
		expect(solidGround).toBe("rgb(62, 111, 244)");
		expect(texturedGrounds.size).toBe(1);
		expect(texturedGrounds.has(solidGround)).toBe(false);
	});

	test('a "parallel" chip stripes the way its bars\' rungs run', () => {
		// The chip is CSS and the bars are canvas, so only this pairing keeps the
		// two in one direction. On vertical bars the tile inks a vertical rung, so
		// the chip must wear the stripe family `"perpendicular"` shows on
		// horizontal bars. Compare chips by equality, not by a literal angle: the
		// browser normalizes a computed gradient string.
		expect(inkedColumns(tileReds("parallel", "vertical"))).toEqual([3, 4]);
		const vertical = chipPaint("vertical");
		const horizontal = chipPaint("horizontal");
		expect(chipOf(vertical, "parallel").backgroundImage).toBe(
			chipOf(horizontal, "perpendicular").backgroundImage,
		);
		expect(chipOf(horizontal, "parallel").backgroundImage).toBe(
			chipOf(vertical, "perpendicular").backgroundImage,
		);
		// The two never stripe alike at one orientation, which is what a dropped or
		// un-inverted angle branch would leave.
		expect(chipOf(vertical, "parallel").backgroundImage).not.toBe(
			chipOf(vertical, "perpendicular").backgroundImage,
		);
	});

	test('a "grid" chip lays both stripe families and never rotates', () => {
		const vertical = chipPaint("vertical");
		const grid = chipOf(vertical, "grid").backgroundImage;
		// Two gradient layers, matching the tile's two rung families: a one-family
		// chip would read as a rung chip and drop the encoding the 8px key carries.
		expect(grid.match(/repeating-linear-gradient\(/g) ?? []).toHaveLength(2);
		// Direction-free like its tile, so the chip is identical on horizontal bars.
		expect(chipOf(chipPaint("horizontal"), "grid").backgroundImage).toBe(grid);
	});
});

describe("textured bar charts", () => {
	const data = [
		{ month: "January", desktop: 100, mobile: 100 },
		{ month: "February", desktop: 100, mobile: 100 },
		{ month: "March", desktop: 100, mobile: 100 },
	];

	const Chart = ({
		mobileTexture,
		orientation = "vertical",
	}: {
		mobileTexture: BarTexture;
		orientation?: BarOrientation;
	}) => (
		<div style={{ width: 600, height: 300 }}>
			<BarChart.Root
				data={data}
				xKey="month"
				animate={false}
				orientation={orientation}
				aria-label="Visitors by month"
			>
				<BarChart.Bar dataKey="desktop" label="Desktop" color="blue" />
				<BarChart.Bar dataKey="mobile" label="Mobile" texture={mobileTexture} color="emerald" />
			</BarChart.Root>
		</div>
	);

	/** The bar paths, without the tile paths inside each `<pattern>`. */
	const barPaths = (container: HTMLElement): SVGPathElement[] =>
		[...container.querySelectorAll('[data-slot="bar-chart-svg"] path')].filter(
			(path): path is SVGPathElement =>
				path instanceof SVGPathElement && path.closest("pattern") == null,
		);

	/** The `<pattern>` each textured bar path fills with, in paint order. */
	const barPatterns = (container: HTMLElement): SVGPatternElement[] => {
		const svg = container.querySelector('[data-slot="bar-chart-svg"]');
		const patterns: SVGPatternElement[] = [];
		for (const path of barPaths(container)) {
			const id = /^url\("?#([^")]+)"?\)$/.exec(path.style.fill)?.[1];
			const pattern = id == null ? null : svg?.querySelector(`pattern[id="${id}"]`);
			if (pattern instanceof SVGPatternElement) {
				patterns.push(pattern);
			}
		}
		return patterns;
	};

	/** The fills of the bar paths that paint a series color, with no texture. */
	const solidBarFills = (container: HTMLElement): string[] =>
		barPaths(container)
			.map((path) => path.style.fill)
			.filter((fill) => fill.startsWith("var("));

	test("a textured series fills its bars with a pattern; a solid one stays flat", async () => {
		const { container } = render(<Chart mobileTexture="hatch" />);
		await waitFor(() => {
			expect(barPatterns(container)).toHaveLength(1);
		});
		expect(solidBarFills(container)).toEqual(["var(--color-chart-blue)"]);
		// The tile paints its ground and its ink.
		expect(barPatterns(container)[0]?.querySelectorAll("path").length).toBeGreaterThan(1);
	});

	test("changing texture on a mounted chart repaints the bars (paint-cache staleness)", async () => {
		// Regression guard for the engine's paint-cache staleness key: the color
		// is unchanged across this rerender, so if the key regressed to comparing
		// colors alone the cache would stay "fresh" and keep painting solid.
		const { container, rerender } = render(<Chart mobileTexture="solid" />);
		await waitFor(() => {
			expect(solidBarFills(container)).toHaveLength(2);
		});
		expect(barPatterns(container)).toHaveLength(0);
		rerender(<Chart mobileTexture="hatch" />);
		await waitFor(() => {
			expect(barPatterns(container)).toHaveLength(1);
		});
	});

	test("flipping orientation on a mounted chart turns the rungs with the bars", async () => {
		// The rung textures bake the bar direction into the tile, so the backend's
		// paint signature has to carry orientation. Keyed on anything less, a
		// chart the consumer flips keeps the rungs its old layout painted. The
		// tile tests above pin which way each rung runs.
		const { container, rerender } = render(<Chart mobileTexture="parallel" />);
		let vertical = "";
		await waitFor(() => {
			vertical = barPatterns(container)[0]?.innerHTML ?? "";
			expect(vertical).not.toBe("");
		});
		rerender(<Chart mobileTexture="parallel" orientation="horizontal" />);
		await waitFor(() => {
			const horizontal = barPatterns(container)[0]?.innerHTML ?? "";
			expect(horizontal).not.toBe("");
			expect(horizontal).not.toBe(vertical);
		});
	});
});
