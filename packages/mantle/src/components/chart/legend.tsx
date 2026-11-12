"use client";

import type { ComponentProps, CSSProperties, ReactNode } from "react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useComposedRefs } from "../../utils/compose-refs/compose-refs.js";
import { cx } from "../../utils/cx/cx.js";
import { POINT_SHAPE_CLIP_PATHS } from "./engine.js";
import { observeResize } from "./environment.js";
import type { ChartStore } from "./store.js";
import { textureInkColor } from "./texture.js";
import type { BarOrientation, BarTexture, SeriesMeta } from "./types.js";
import { useChartContext, useStoreSeries } from "./context.js";

/**
 * The legend part: one swatch and label for each registered series.
 *
 * This module is internal shared implementation — not exported from the package.
 */

/** Subscribe to the registered bar direction only (see {@link useStoreSeries}). */
const useStoreOrientation = (store: ChartStore): BarOrientation =>
	useSyncExternalStore(
		store.subscribe,
		() => store.getSnapshot().orientation,
		() => store.getSnapshot().orientation,
	);

type LegendPrimitiveProps = Omit<ComponentProps<"div">, "children"> & {
	/**
	 * Classes for the legend. The legend wraps its items and does not shrink.
	 * Past `max-h-16` it scrolls; set another `max-h-*` to change the bound.
	 */
	className?: string;
	/** Replace the default legend items; receives the registered series. */
	children?: (series: SeriesMeta[]) => ReactNode;
};

/**
 * One stripe family of the CSS texture a textured bar legend key wears. The
 * stripes are denser than the canvas tile (a key is read at 8px, not bar
 * scale) but carry the same tone-on-tone ink, so key and bars match. CSS
 * gradient angles are perpendicular to their stripes: `135deg` renders the
 * 45° `/` family, `45deg` its `\` mirror, `0deg` horizontal rungs, `90deg`
 * vertical rungs.
 */
const legendHatchGradient = (
	angle: "0deg" | "45deg" | "90deg" | "135deg",
	ink: string,
	period = 3,
): string =>
	`repeating-linear-gradient(${angle}, ${ink} 0, ${ink} 1px, transparent 1px, transparent ${period}px)`;

/**
 * Legend keys are pure color/texture chips, so they keep their author colors
 * where backgrounds are normally stripped: forced-colors mode (the sanctioned
 * `forced-color-adjust: none` use) and printing (where default settings drop
 * CSS backgrounds entirely) — otherwise the series↔label mapping vanishes in
 * exactly the modes textures exist to serve.
 */
const LEGEND_SWATCH_PAINT_CLASSES =
	"forced-color-adjust-none [print-color-adjust:exact] [-webkit-print-color-adjust:exact]";

/**
 * The legend chip's background layers, one entry per non-solid texture. Dots
 * tile a sized radial gradient; every hatch and rung texture lays one or two
 * stripe gradients. A two-family texture widens its period, so the 8px chip
 * does not read as a darker solid.
 *
 * A total record makes a missing chip a compile error. The compiler names a
 * ninth `BarTexture` value's missing entry, where a fall-through would paint it
 * as dots — a wrong-but-plausible key nobody would question.
 */
const LEGEND_TEXTURE_LAYERS: Record<
	Exclude<BarTexture, "solid">,
	(paint: { ink: string; orientation: BarOrientation }) => CSSProperties
> = {
	hatch: ({ ink }) => ({ backgroundImage: legendHatchGradient("135deg", ink) }),
	"hatch-reverse": ({ ink }) => ({ backgroundImage: legendHatchGradient("45deg", ink) }),
	crosshatch: ({ ink }) => ({
		// A wider period than the single-direction hatches: two 3px-period
		// families on an 8px chip are ~56% ink and read as a darker solid.
		backgroundImage: `${legendHatchGradient("135deg", ink, 4)}, ${legendHatchGradient("45deg", ink, 4)}`,
	}),
	perpendicular: ({ ink, orientation }) => ({
		// The rung runs across the bar's length, so it flips with the bars:
		// horizontal rungs on vertical bars, vertical rungs on horizontal bars —
		// matching the canvas tile in texture.ts.
		backgroundImage: legendHatchGradient(orientation === "horizontal" ? "90deg" : "0deg", ink),
	}),
	parallel: ({ ink, orientation }) => ({
		// The complement of `"perpendicular"`, so the angles swap: vertical rungs
		// on vertical bars, horizontal rungs on horizontal bars. Chip and tile
		// must agree in direction, or the key stops matching the bars it names.
		backgroundImage: legendHatchGradient(orientation === "horizontal" ? "0deg" : "90deg", ink),
	}),
	grid: ({ ink }) => ({
		// Two families, so the period widens exactly as crosshatch's does: three
		// 1px stripes per family are ~61% ink on an 8px chip, louder than every
		// shipped key. Both families ink either way, which keeps the chip
		// direction-free like its tile.
		backgroundImage: `${legendHatchGradient("0deg", ink, 4)}, ${legendHatchGradient("90deg", ink, 4)}`,
	}),
	dots: ({ ink }) => ({
		backgroundImage: `radial-gradient(circle at 1px 1px, ${ink} 0.75px, transparent 0.8px)`,
		backgroundSize: "3px 3px",
	}),
};

/**
 * The background layers mirroring a bar series' canvas texture on its legend
 * key — empty for solid fills so the plain swatch color shows.
 */
const legendTextureStyle = (
	texture: BarTexture,
	color: string,
	orientation: BarOrientation,
): CSSProperties => {
	if (texture === "solid") {
		return {};
	}
	return LEGEND_TEXTURE_LAYERS[texture]({ ink: textureInkColor(color), orientation });
};

/**
 * A legend key that mirrors its series' mark AND its redundant encoding —
 * the channel that keeps series apart without color vision — so the key
 * carries it everywhere the marks do: scatter and area keys are the glyph
 * itself (the area glyph is exactly what its hover dot shows), line keys are
 * the glyph riding a short stroke, and bar keys are filled squares wearing
 * the series' fill texture (bars encode identity by texture, not glyph).
 */
const LegendSwatch = ({
	series,
	orientation,
}: {
	series: SeriesMeta;
	orientation: BarOrientation;
}) => {
	if (series.mark === "bar") {
		return (
			<span
				aria-hidden
				data-texture={series.texture}
				className={cx("size-2 shrink-0 rounded-[2px]", LEGEND_SWATCH_PAINT_CLASSES)}
				style={{
					backgroundColor: series.color,
					...legendTextureStyle(series.texture, series.color, orientation),
				}}
			/>
		);
	}
	if (series.mark === "line") {
		// The classic composite line key: the series' glyph centered on a short
		// stroke, mirroring canvas markers and the hover dot.
		return (
			<span aria-hidden className="relative flex h-2 w-3 shrink-0 items-center justify-center">
				<span
					className={cx(
						"absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 rounded-full",
						LEGEND_SWATCH_PAINT_CLASSES,
					)}
					style={{ backgroundColor: series.color }}
				/>
				<span
					data-shape={series.shape}
					className={cx("relative size-2", LEGEND_SWATCH_PAINT_CLASSES)}
					style={{
						backgroundColor: series.color,
						clipPath: POINT_SHAPE_CLIP_PATHS[series.shape],
					}}
				/>
			</span>
		);
	}
	return (
		<span
			aria-hidden
			data-shape={series.shape}
			className={cx("size-2 shrink-0", LEGEND_SWATCH_PAINT_CLASSES)}
			style={{
				backgroundColor: series.color,
				clipPath: POINT_SHAPE_CLIP_PATHS[series.shape],
			}}
		/>
	);
};

/**
 * The legend: a real DOM flex row keyed by series color. Renders nothing for
 * a single series — one color needs no legend box; the chart's title already
 * names it. Swatches mirror the mark and its glyph: the shape riding a short
 * stroke for lines, the shape itself for scatter points and areas, a filled
 * square for bars. The legend never shrinks the plot by more than its
 * `max-h-16` bound: past that, it scrolls.
 *
 * No `asChild`: `children` is a render prop (the series list), which is
 * incompatible with Slot's single-element-child contract; use `className`
 * or the render prop for customization.
 */
const ChartLegendPrimitive = ({
	partName,
	slotName,
	className,
	children,
	ref,
	...props
}: LegendPrimitiveProps & { partName: string; slotName: string }) => {
	const context = useChartContext(partName);
	// Selector subscriptions: a hover publish must not re-render the legend.
	const series = useStoreSeries(context.store);
	const orientation = useStoreOrientation(context.store);
	const legendRef = useRef<HTMLDivElement>(null);
	const composedRef = useComposedRefs(legendRef, ref);
	const [scrollable, setScrollable] = useState(false);
	useEffect(() => {
		const element = legendRef.current;
		// Why `series` here: a legend at its height bound does not resize when it
		// gets more entries. Each new `observe()` reads once after layout.
		if (element == null || series.length < 2) {
			return;
		}
		return observeResize(element, () => {
			setScrollable(element.scrollHeight > element.clientHeight);
		});
	}, [series]);
	if (series.length < 2) {
		return null;
	}
	return (
		<div
			ref={composedRef}
			data-slot={`${slotName}-legend`}
			className={cx(
				// Why the height bound: the plot is the only part of a fixed-height Root that
				// shrinks, so a legend with many series can take all of its height.
				"text-muted focus-visible:ring-focus-accent flex max-h-16 shrink-0 flex-wrap items-center gap-x-4 gap-y-1 overflow-y-auto rounded-sm pt-3 text-xs outline-none focus-visible:ring-2",
				className,
			)}
			// Why: Safari does not put a scroll container in the Tab order, so keyboard
			// users could not reach the clipped entries.
			{...(scrollable && { role: "group", "aria-label": "Legend", tabIndex: 0 })}
			{...props}
		>
			{children != null ? (
				// Why the label div: decisions/2026-08-04-translation-safe-label-wrappers.md
				<div data-slot={`${slotName}-legend-label`} className="contents">
					{children(series)}
				</div>
			) : (
				series.map((item) => (
					<div key={item.dataKey} className="flex items-center gap-1.5">
						<LegendSwatch series={item} orientation={orientation} />
						{item.label}
					</div>
				))
			)}
		</div>
	);
};

export type {
	//,
	LegendPrimitiveProps,
};

export {
	//,
	ChartLegendPrimitive,
};
