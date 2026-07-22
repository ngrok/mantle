import type { BarOrientation, BarTexture } from "./types.js";

/**
 * Pattern-fill tiles for textured bar series.
 *
 * Texture is a redundant identity encoding alongside color: diagonal hatch
 * families at 45° and its 135° mirror, rungs perpendicular to the bar's
 * length, and an offset dot grid. The ink is tone-on-tone — a darker step of
 * the series' own fill, at equal loudness across every slot — so a textured
 * series never shouts over a solid one.
 *
 * Tiles are rasterized at the device pixel ratio and the returned pattern is
 * pre-scaled back down, so under the engine's dpr canvas transform the lines
 * stay crisp instead of resampling.
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
 * The perpendicular rung is thicker than a hatch line: one short rung per
 * tile carries less run-length than a diagonal, so 2px keeps its ink coverage
 * at the same loudness — and lands on the device grid at integer ratios.
 */
const PERPENDICULAR_LINE_WIDTH = 2;
/** Dot radius sized so two dots per tile match the hatch families' loudness. */
const DOT_RADIUS = 1.6;

/**
 * The tone-on-tone ink for a texture's marks: the series' resolved fill
 * stepped down a fixed perceptual amount in OKLCH — the next darker step of
 * its own ramp. A fixed lightness step (not a proportional mix toward black)
 * keeps the ink equally loud over the dark fills of the light high-contrast
 * theme and the bright fills of the dark themes alike.
 *
 * @example
 * ```ts
 * textureInkColor("oklch(0.623 0.188 259.813)");
 * // "oklch(from oklch(0.623 0.188 259.813) calc(l - 0.18) c h)"
 * ```
 */
const textureInkColor = (seriesColor: string): string =>
	`oklch(from ${seriesColor} calc(l - 0.18) c h)`;

/**
 * The subset of the 2D context {@link traceDiagonalLines} traces into —
 * structural, so unit tests can record calls without a real canvas.
 */
type LineTraceContext = Pick<CanvasRenderingContext2D, "moveTo" | "lineTo">;

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

type BarTexturePatternOptions = {
	/** The non-solid texture to rasterize. */
	texture: Exclude<BarTexture, "solid">;
	/** The series' resolved, canvas-paintable fill color (the tile ground). */
	color: string;
	/** The resolved tone-on-tone line ink (see {@link textureInkColor}). */
	ink: string;
	/** The device pixel ratio the engine's canvas transform is scaled by. */
	devicePixelRatio: number;
	/**
	 * The chart's bar direction — the `"perpendicular"` rung runs across the
	 * bar's length, so it flips with the bars (other textures are direction-free).
	 */
	orientation: BarOrientation;
};

/**
 * Rasterize a repeating texture tile and wrap it in a `CanvasPattern` ready
 * to assign to `fillStyle` in place of the series' solid color. Returns
 * `null` when a tile context is unavailable — callers must fall back to the
 * solid series color so the bars never vanish.
 *
 * @example
 * ```ts
 * const pattern = createBarTexturePattern(ctx, {
 *   texture: "hatch",
 *   color: resolvedSeriesColor,
 *   ink: resolvedInkColor,
 *   devicePixelRatio: 2,
 *   orientation: "vertical",
 * });
 * drawBars(ctx, { fill: pattern ?? resolvedSeriesColor, rects });
 * ```
 */
const createBarTexturePattern = (
	context: CanvasRenderingContext2D,
	options: BarTexturePatternOptions,
): CanvasPattern | null => {
	const { texture, color, ink, devicePixelRatio, orientation } = options;
	const size = TEXTURE_TILE_SIZE;
	const tile = context.canvas.ownerDocument.createElement("canvas");
	tile.width = Math.max(1, Math.round(size * devicePixelRatio));
	tile.height = tile.width;
	const tileContext = tile.getContext("2d");
	if (tileContext == null) {
		return null;
	}
	const deviceScale = tile.width / size;
	tileContext.scale(deviceScale, deviceScale);
	tileContext.fillStyle = color;
	tileContext.fillRect(0, 0, size, size);
	if (texture === "perpendicular") {
		// One centered rung per tile, perpendicular to the bar's length —
		// horizontal on vertical bars, vertical on horizontal bars. Centered,
		// it tiles with no edge stitching.
		tileContext.fillStyle = ink;
		if (orientation === "horizontal") {
			tileContext.fillRect(
				size / 2 - PERPENDICULAR_LINE_WIDTH / 2,
				0,
				PERPENDICULAR_LINE_WIDTH,
				size,
			);
		} else {
			tileContext.fillRect(
				0,
				size / 2 - PERPENDICULAR_LINE_WIDTH / 2,
				size,
				PERPENDICULAR_LINE_WIDTH,
			);
		}
	} else if (texture === "dots") {
		// An offset grid: two dots per tile on the quarter points, interior to
		// the tile so no dot straddles a seam.
		tileContext.fillStyle = ink;
		tileContext.beginPath();
		tileContext.arc(size / 4, size / 4, DOT_RADIUS, 0, Math.PI * 2);
		// A fresh subpath — otherwise the arcs join with a connecting line.
		tileContext.moveTo((3 * size) / 4 + DOT_RADIUS, (3 * size) / 4);
		tileContext.arc((3 * size) / 4, (3 * size) / 4, DOT_RADIUS, 0, Math.PI * 2);
		tileContext.fill();
	} else {
		tileContext.strokeStyle = ink;
		tileContext.lineWidth = texture === "crosshatch" ? CROSSHATCH_LINE_WIDTH : TEXTURE_LINE_WIDTH;
		tileContext.beginPath();
		if (texture === "hatch" || texture === "crosshatch") {
			traceDiagonalLines(tileContext, size, "up");
		}
		if (texture === "hatch-reverse" || texture === "crosshatch") {
			traceDiagonalLines(tileContext, size, "down");
		}
		tileContext.stroke();
	}
	const pattern = context.createPattern(tile, "repeat");
	// The tile is rasterized at device resolution; scale it back to CSS pixels
	// so the engine's dpr transform lands it 1:1 on the device grid.
	pattern?.setTransform({ a: 1 / deviceScale, b: 0, c: 0, d: 1 / deviceScale, e: 0, f: 0 });
	return pattern;
};

export type {
	//,
	BarTexturePatternOptions,
	LineTraceContext,
};
export {
	//,
	createBarTexturePattern,
	textureInkColor,
	TEXTURE_TILE_SIZE,
	traceDiagonalLines,
};
