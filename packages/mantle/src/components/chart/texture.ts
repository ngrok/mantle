import type { PaintContext } from "./paint-backend.js";
import type { BarOrientation, BarTexture } from "./types.js";

/**
 * Pattern-fill tiles for textured bar series.
 *
 * Texture is a redundant identity encoding alongside color: diagonal hatch
 * families at 45° and its 135° mirror, their crossed lattice, one rung per
 * tile across or along the bar's length, the orthogonal lattice of both rung
 * directions, and an offset dot field. The marks ink in the full series color
 * over a light tint of it, so a textured series reads as the light member of
 * its color's pair beside a solid series of the same color.
 *
 * The SVG backend records each tile into a `<pattern>`, so the browser
 * rasterizes it at the screen's resolution.
 *
 * This module is internal shared implementation — not exported from the package.
 */

/** The texture period in CSS pixels — one tile edge. */
const TEXTURE_TILE_SIZE = 8;
/** Stroke width of a single-direction hatch line, in CSS pixels. */
const TEXTURE_LINE_WIDTH = 1.5;
/** Crosshatch inks two line families, so each thins to stay near single-family loudness. */
const CROSSHATCH_LINE_WIDTH = 1;
/**
 * A single rung is thicker than a hatch line: one rung per tile carries less
 * run-length than a diagonal, so 2px keeps its ink coverage at the same
 * loudness — and lands on the device grid at integer ratios. Both single-rung
 * textures read it: `"parallel"` is `"perpendicular"` rotated a quarter turn.
 * Either way the rung measures 25% ink at every device pixel ratio.
 */
const RUNG_LINE_WIDTH = 2;
/**
 * Why grid needs its own width: it inks two rung families a full tile apart,
 * where crosshatch's two diagonal families sit 5.66px apart. The wider spacing
 * costs ink, so neither shipped width fits. The crosshatch width measures 23%
 * and the rung width 44%, against a shipped band of 25% to 32%. 1.1px measures
 * 25.6%, between `"perpendicular"` and `"hatch"` at every device pixel ratio.
 */
const GRID_LINE_WIDTH = 1.1;
/** Dot radius sized so two dots per tile match the hatch families' loudness. */
const DOT_RADIUS = 1.6;

/** How much of the series color a texture's ground mixes into the card surface. */
const TEXTURE_GROUND_SHARE = 25;

/**
 * The ground under a texture's marks: a light tint of the series color over
 * the card surface. The marks ink in the full series color, so a textured
 * series reads as the light member of its color's pair, beside a solid series
 * of the same color.
 *
 * @example
 * ```ts
 * textureGroundColor("var(--color-chart-neutral)");
 * // "color-mix(in oklab, var(--color-chart-neutral) 25%, var(--background-color-card))"
 * ```
 */
const textureGroundColor = (seriesColor: string): string =>
	`color-mix(in oklab, ${seriesColor} ${TEXTURE_GROUND_SHARE}%, var(--background-color-card))`;

/**
 * The subset of the 2D context {@link traceDiagonalLines} traces into —
 * structural, so unit tests can record calls without a real canvas.
 */
type LineTraceContext = Pick<PaintContext, "moveTo" | "lineTo">;

/**
 * Trace one seamless family of parallel diagonal lines across a square tile:
 * the extended tile diagonal plus the two corner stubs that continue it in
 * the neighboring tiles. `direction` picks the 45° family (`"up"`, rendering
 * like `/`) or its 135° mirror (`"down"`, rendering like `\`).
 *
 * @example
 * ```ts
 * tileContext.beginPath();
 * traceDiagonalLines(tileContext, TEXTURE_TILE_SIZE, "up");
 * tileContext.stroke();
 * ```
 */
const traceDiagonalLines = (
	tileContext: LineTraceContext,
	size: number,
	direction: "up" | "down",
): void => {
	// Overhang past the tile edges so butt caps never leave corner gaps.
	const overhang = TEXTURE_LINE_WIDTH;
	if (direction === "up") {
		tileContext.moveTo(-overhang, size + overhang);
		tileContext.lineTo(size + overhang, -overhang);
		tileContext.moveTo(-overhang, overhang);
		tileContext.lineTo(overhang, -overhang);
		tileContext.moveTo(size - overhang, size + overhang);
		tileContext.lineTo(size + overhang, size - overhang);
		return;
	}
	tileContext.moveTo(-overhang, -overhang);
	tileContext.lineTo(size + overhang, size + overhang);
	tileContext.moveTo(size - overhang, -overhang);
	tileContext.lineTo(size + overhang, overhang);
	tileContext.moveTo(-overhang, size - overhang);
	tileContext.lineTo(overhang, size + overhang);
};

/**
 * Ink one horizontal rung across the middle of the tile. Centered, it tiles
 * with no visible seam — an edge-anchored rung stitches against its neighbor.
 */
const fillHorizontalRung = (
	tileContext: PaintContext,
	options: { size: number; width: number },
): void => {
	const { size, width } = options;
	tileContext.fillRect(0, size / 2 - width / 2, size, width);
};

/**
 * Ink one vertical rung down the middle of the tile — the quarter turn of
 * {@link fillHorizontalRung}, centered for the same reason.
 */
const fillVerticalRung = (
	tileContext: PaintContext,
	options: { size: number; width: number },
): void => {
	const { size, width } = options;
	tileContext.fillRect(size / 2 - width / 2, 0, width, size);
};

/** What a tile painter inks with. */
type TilePaint = {
	/** The tile edge in CSS pixels. */
	size: number;
	/** The marks' color: the full series color. */
	ink: string;
	/** The chart's bar direction, read by the two single-rung textures. */
	orientation: BarOrientation;
};

/**
 * Ink one texture's marks into a tile whose ground the caller already filled.
 * Each painter sets its own ink, width, and path, so no width leaks from one
 * texture to the next.
 */
type TilePainter = (tileContext: PaintContext, paint: TilePaint) => void;

/**
 * One painter per non-solid texture, keyed by the union itself. A total record
 * makes a half-painted tile a compile error: the compiler names a ninth
 * `BarTexture` value's missing entry, where a fall-through would paint that
 * value as another texture.
 */
const TILE_PAINTERS: Record<Exclude<BarTexture, "solid">, TilePainter> = {
	hatch: (tileContext, { size, ink }) => {
		tileContext.strokeStyle = ink;
		tileContext.lineWidth = TEXTURE_LINE_WIDTH;
		tileContext.beginPath();
		traceDiagonalLines(tileContext, size, "up");
		tileContext.stroke();
	},
	"hatch-reverse": (tileContext, { size, ink }) => {
		tileContext.strokeStyle = ink;
		tileContext.lineWidth = TEXTURE_LINE_WIDTH;
		tileContext.beginPath();
		traceDiagonalLines(tileContext, size, "down");
		tileContext.stroke();
	},
	crosshatch: (tileContext, { size, ink }) => {
		tileContext.strokeStyle = ink;
		tileContext.lineWidth = CROSSHATCH_LINE_WIDTH;
		tileContext.beginPath();
		traceDiagonalLines(tileContext, size, "up");
		traceDiagonalLines(tileContext, size, "down");
		tileContext.stroke();
	},
	perpendicular: (tileContext, { size, ink, orientation }) => {
		// Why the flip: this rung runs across the bar's length, so vertical bars
		// wear a horizontal rung and horizontal bars a vertical one.
		tileContext.fillStyle = ink;
		if (orientation === "horizontal") {
			fillVerticalRung(tileContext, { size, width: RUNG_LINE_WIDTH });
		} else {
			fillHorizontalRung(tileContext, { size, width: RUNG_LINE_WIDTH });
		}
	},
	parallel: (tileContext, { size, ink, orientation }) => {
		// The complement of `"perpendicular"`: this rung runs along the bar's
		// length, so the flip resolves the other way — vertical bars wear a
		// vertical rung.
		tileContext.fillStyle = ink;
		if (orientation === "horizontal") {
			fillHorizontalRung(tileContext, { size, width: RUNG_LINE_WIDTH });
		} else {
			fillVerticalRung(tileContext, { size, width: RUNG_LINE_WIDTH });
		}
	},
	grid: (tileContext, { size, ink }) => {
		// Why no orientation branch: both rung families ink either way, so a
		// runtime orientation change leaves the lattice identical.
		tileContext.fillStyle = ink;
		fillHorizontalRung(tileContext, { size, width: GRID_LINE_WIDTH });
		fillVerticalRung(tileContext, { size, width: GRID_LINE_WIDTH });
	},
	dots: (tileContext, { size, ink }) => {
		// An offset field: two dots per tile on the quarter points, interior to
		// the tile so no dot straddles a seam.
		tileContext.fillStyle = ink;
		tileContext.beginPath();
		tileContext.arc(size / 4, size / 4, DOT_RADIUS, 0, Math.PI * 2);
		// A fresh subpath — otherwise the arcs join with a connecting line.
		tileContext.moveTo((3 * size) / 4 + DOT_RADIUS, (3 * size) / 4);
		tileContext.arc((3 * size) / 4, (3 * size) / 4, DOT_RADIUS, 0, Math.PI * 2);
		tileContext.fill();
	},
};

/**
 * Paint one texture tile, ground and marks, into `tileContext` at CSS-pixel
 * scale: {@link TEXTURE_TILE_SIZE} on each edge. The SVG backend records it
 * into a `<pattern>`.
 *
 * @example
 * ```ts
 * paintTextureTile(recorder, { texture: "hatch", ground: textureGroundColor(color), ink: color, orientation: "vertical" });
 * ```
 */
const paintTextureTile = (
	tileContext: PaintContext,
	options: {
		texture: Exclude<BarTexture, "solid">;
		/** The tile's ground: see {@link textureGroundColor}. */
		ground: string;
		/** The marks' color: the full series color. */
		ink: string;
		orientation: BarOrientation;
	},
): void => {
	const { texture, ground, ink, orientation } = options;
	tileContext.fillStyle = ground;
	tileContext.fillRect(0, 0, TEXTURE_TILE_SIZE, TEXTURE_TILE_SIZE);
	TILE_PAINTERS[texture](tileContext, { size: TEXTURE_TILE_SIZE, ink, orientation });
};

export type {
	//,
	LineTraceContext,
};
export {
	//,
	paintTextureTile,
	textureGroundColor,
	TEXTURE_TILE_SIZE,
	traceDiagonalLines,
};
