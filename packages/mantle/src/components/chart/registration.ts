"use client";

import { useId, useLayoutEffect } from "react";
import invariant from "tiny-invariant";
import type {
	BarTexture,
	CurveKind,
	GridLines,
	PointShape,
	SeriesColor,
	SeriesMark,
	XTickContext,
	XValue,
	YAxisSide,
	YDomain,
	YScale,
	YTickContext,
} from "./types.js";
import { useChartContext } from "./context.js";
import { paintEmptySlots } from "./empty-slot.js";

/**
 * The renderless parts (series, grid, axes, reference lines, empty slots)
 * that register their configuration with the Root's store.
 *
 * This module is internal shared implementation. The package does not export it.
 */

type SeriesPrimitiveProps = {
	dataKey: string;
	label?: string;
	color: SeriesColor;
	curve?: CurveKind;
	markers?: boolean;
	connectNulls?: boolean;
	/** The point glyph (scatter marks, line markers, hover dots), worn by the marks and their legend key. Defaults to `"circle"`. */
	shape?: PointShape;
	/** The fill texture (bar marks only), worn by the bars and their legend key. */
	texture?: BarTexture;
	/**
	 * The y axis whose scale places the series' values: `"left"` (the default)
	 * or `"right"`. A `"right"` series needs a `YAxis side="right"` in the same Root.
	 */
	yAxis?: YAxisSide;
};

/**
 * Register a series (renderless). The public series parts (`BarChart.Bar`,
 * `LineChart.Line`, `AreaChart.Area`) wrap this with their mark fixed. A line
 * or an area composes in a bar chart too, over the bars.
 */
const useSeriesPrimitive = (
	partName: string,
	mark: SeriesMark,
	props: SeriesPrimitiveProps,
): null => {
	const context = useChartContext(partName);
	// A Root owns the x axis, and each series draws its own mark on it. A bar
	// needs a slot for each category, and a point needs a scatter plot's axes.
	// A line or an area draws on any category or continuous x axis.
	invariant(
		mark === "bar" || mark === "scatter" ? context.kind === mark : context.kind !== "scatter",
		() =>
			`${partName} cannot be composed inside ${context.componentName}.Root.${mark === "bar" ? " A bar needs a slot for each category, which only BarChart.Root has." : ""}`,
	);
	const {
		dataKey,
		label,
		color,
		curve = "linear",
		markers = false,
		connectNulls = false,
		shape = "circle",
		texture = "solid",
		yAxis = "left",
	} = props;
	useLayoutEffect(
		() =>
			context.store.registerSeries({
				dataKey,
				label: label ?? dataKey,
				color,
				mark,
				curve,
				markers,
				connectNulls,
				shape,
				texture,
				yAxis,
			}),
		[
			context.store,
			dataKey,
			label,
			color,
			mark,
			curve,
			markers,
			connectNulls,
			shape,
			texture,
			yAxis,
		],
	);
	return null;
};

type GridPrimitiveProps = {
	/** Which gridlines to draw. */
	lines?: GridLines;
};

const useGridPrimitive = (partName: string, props: GridPrimitiveProps): null => {
	const context = useChartContext(partName);
	// Pass `undefined` through when the author left the direction unset, so the
	// engine defaults it perpendicular to the bars (value gridlines). A hard
	// "horizontal" default draws category-parallel lines on horizontal bars.
	const { lines } = props;
	useLayoutEffect(() => context.store.registerGrid(lines), [context.store, lines]);
	return null;
};

type XAxisPrimitiveProps = {
	/**
	 * Format a tick label. Receives the chart's x values: the category value on
	 * band/point scales, a `Date` on time scales, and a number on linear scales.
	 * The second argument carries the `defaultLabel` the axis paints without a
	 * formatter, so a formatter can decorate it. The chart compares the function
	 * by identity, so a new function paints the chart again. The React Compiler
	 * in your build keeps an inline function stable. Without it, define the
	 * function outside the component.
	 */
	tickFormat?: (value: XValue, context: XTickContext) => string;
	/**
	 * Target tick count (continuous scales only; a density-derived default
	 * otherwise). Approximate: ticks land on human-friendly steps, and a linear
	 * axis whose x values are all integers never renders fractional ticks:
	 * the integer step wins over the requested count.
	 */
	tickCount?: number;
};

const useXAxisPrimitive = (partName: string, props: XAxisPrimitiveProps): null => {
	const context = useChartContext(partName);
	const { tickFormat, tickCount } = props;
	useLayoutEffect(
		() => context.store.registerXAxis({ tickFormat, tickCount }),
		[context.store, tickFormat, tickCount],
	);
	return null;
};

type YAxisBaseProps = {
	/**
	 * The edge the axis paints on: `"left"` (the default) or `"right"`. A series
	 * or a reference line with `yAxis="right"` reads the right axis's scale.
	 * The right axis puts its ticks on the left axis's grid lines when it can.
	 */
	side?: YAxisSide;
	/**
	 * Format a tick label. Defaults to thousands-separated numbers. The second
	 * argument carries the tick `step` and the `defaultLabel`, whose precision
	 * follows the step. A formatter that adds a unit can decorate
	 * `defaultLabel` and needs no precision of its own. The chart compares the
	 * function by identity, so a new function paints the chart again. The React
	 * Compiler in your build keeps an inline function stable. Without it, define
	 * the function outside the component. Under `logScale` the ticks are powers
	 * of ten, `step` is `0`, and `defaultLabel` is compact, such as `1K` or `1M`.
	 */
	tickFormat?: (value: number, context: YTickContext) => string;
	/**
	 * Maximum tick count. When omitted, the axis aims for about 5 ticks. Ticks
	 * land on human-friendly steps, so the axis can render fewer. The plot
	 * height also limits the count: a vertical axis keeps about 28px for each
	 * tick, and it drops a label that would overlap its neighbor. When every
	 * series value is an integer (counts), the axis never renders fractional
	 * ticks.
	 */
	tickCount?: number;
};

/**
 * The props of a family's `YAxis`. `TDomain` is the domain the linear scale
 * takes. A `YScale` such as `logScale` takes any domain, because its lowest
 * value is the bottom of the plot, not zero. A family without `TLog` takes no
 * `YScale`.
 */
type YAxisPrimitiveProps<
	TDomain extends YDomain = YDomain,
	TLog extends boolean = true,
> = YAxisBaseProps &
	(
		| {
				/**
				 * How values map to height. `"linear"` (the default) spaces values
				 * evenly. `logScale`, imported from the chart's module, spaces each
				 * power of ten evenly. Only a chart that imports it ships its code.
				 */
				scale?: "linear";
				/**
				 * Fix either end of the axis's domain; an `"auto"` end follows the data.
				 * Ticks still land on round steps inside a fixed domain.
				 *
				 * @example
				 * ```tsx
				 * <LineChart.YAxis domain={[0, "auto"]} />
				 * ```
				 */
				domain?: TDomain;
		  }
		| (TLog extends true
				? {
						/**
						 * How values map to height: `logScale`, imported from the chart's
						 * module, spaces each power of ten evenly. A value at or below zero
						 * has no mark, and a `domain` end at or below zero follows the data.
						 */
						scale: YScale;
						/**
						 * Fix either end of the scaled axis. A positive end is kept. An
						 * `"auto"` end, or one at or below zero, follows the data: the
						 * minimum is a power of ten at least one decade below the smallest
						 * positive value.
						 *
						 * @example
						 * ```tsx
						 * <BarChart.YAxis scale={logScale} domain={[0, maxCount]} />
						 * ```
						 */
						domain?: YDomain;
					}
				: never)
	);

const useYAxisPrimitive = (partName: string, props: YAxisPrimitiveProps): null => {
	const context = useChartContext(partName);
	const { side = "left", tickFormat, tickCount, domain, scale = "linear" } = props;
	// Why the ends and not the tuple: an inline `domain` is a new array on each
	// render, and a new spec re-aims the domain.
	const min = domain?.[0];
	const max = domain?.[1];
	const id = useId();
	useLayoutEffect(
		() =>
			context.store.registerYAxis(
				side,
				{
					tickFormat,
					tickCount,
					domain: min == null || max == null ? undefined : [min, max],
					// Why `undefined`: the engine scales only an axis that has a `YScale`.
					scale: scale === "linear" ? undefined : scale,
				},
				id,
			),
		[context.store, side, tickFormat, tickCount, min, max, scale, id],
	);
	return null;
};

type ReferenceLinePrimitiveProps = {
	/** The y value the line marks (an SLO threshold, a budget, a limit). */
	y: number;
	/** A short label painted above the line's right end. */
	label?: string;
	/** Line color; defaults to the neutral reference color. */
	color?: SeriesColor;
	/** The y axis whose scale places `y`: `"left"` (the default) or `"right"`. */
	yAxis?: YAxisSide;
};

const useReferenceLinePrimitive = (partName: string, props: ReferenceLinePrimitiveProps): null => {
	const context = useChartContext(partName);
	const id = useId();
	const { y, label, color, yAxis = "left" } = props;
	useLayoutEffect(
		() => context.store.registerReferenceLine(id, { y, yAxis, label, color }),
		[context.store, id, y, yAxis, label, color],
	);
	return null;
};

type EmptySlotPrimitiveProps = {
	/** Why a row has no reading, such as `"No traffic since it started 15h ago"`. */
	label: string;
};

/**
 * Register the empty-slot label (renderless). Bar charts only: the engine
 * outlines a bar row with no reading, and the readouts say the label there.
 */
const useEmptySlotPrimitive = (partName: string, props: EmptySlotPrimitiveProps): null => {
	const context = useChartContext(partName);
	invariant(
		context.kind === "bar",
		() => `${partName} cannot be composed inside ${context.componentName}.Root.`,
	);
	const { label } = props;
	useLayoutEffect(
		() => context.store.registerEmptySlot({ label, paint: paintEmptySlots }),
		[context.store, label],
	);
	return null;
};

export type {
	//,
	EmptySlotPrimitiveProps,
	GridPrimitiveProps,
	ReferenceLinePrimitiveProps,
	SeriesPrimitiveProps,
	XAxisPrimitiveProps,
	YAxisPrimitiveProps,
};

export {
	//,
	useEmptySlotPrimitive,
	useGridPrimitive,
	useReferenceLinePrimitive,
	useSeriesPrimitive,
	useXAxisPrimitive,
	useYAxisPrimitive,
};
