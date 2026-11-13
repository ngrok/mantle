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
	YTickContext,
} from "./types.js";
import { useChartContext } from "./context.js";

/**
 * The renderless parts (series, grid, axes, reference lines) that register
 * their configuration with the Root's store.
 *
 * This module is internal shared implementation — not exported from the package.
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
	/** The fill texture (bar marks only) — worn by the bars and their legend key. */
	texture?: BarTexture;
};

/**
 * Register a series (renderless). The public series parts — `BarChart.Bar`,
 * `LineChart.Line`, `AreaChart.Area` — wrap this with their mark fixed.
 */
const useSeriesPrimitive = (
	partName: string,
	mark: SeriesMark,
	props: SeriesPrimitiveProps,
): null => {
	const context = useChartContext(partName);
	invariant(
		context.kind === mark,
		() =>
			`${partName} cannot be composed inside ${context.componentName}.Root — compose ${context.componentName} series parts instead.`,
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
			}),
		[context.store, dataKey, label, color, mark, curve, markers, connectNulls, shape, texture],
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
	 * formatter, so a formatter can decorate it.
	 */
	tickFormat?: (value: XValue, context: XTickContext) => string;
	/**
	 * Target tick count (continuous scales only; a density-derived default
	 * otherwise). Approximate: ticks land on human-friendly steps, and a linear
	 * axis whose x values are all integers never renders fractional ticks —
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

type YAxisPrimitiveProps = {
	/**
	 * Format a tick label. Defaults to thousands-separated numbers. The second
	 * argument carries the tick `step` and the `defaultLabel`, whose precision
	 * follows the step. A formatter that adds a unit can decorate
	 * `defaultLabel` and needs no precision of its own.
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

const useYAxisPrimitive = (partName: string, props: YAxisPrimitiveProps): null => {
	const context = useChartContext(partName);
	const { tickFormat, tickCount } = props;
	useLayoutEffect(
		() => context.store.registerYAxis({ tickFormat, tickCount }),
		[context.store, tickFormat, tickCount],
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
};

const useReferenceLinePrimitive = (partName: string, props: ReferenceLinePrimitiveProps): null => {
	const context = useChartContext(partName);
	const id = useId();
	const { y, label, color } = props;
	useLayoutEffect(
		() => context.store.registerReferenceLine(id, { y, label, color }),
		[context.store, id, y, label, color],
	);
	return null;
};

export type {
	//,
	GridPrimitiveProps,
	ReferenceLinePrimitiveProps,
	SeriesPrimitiveProps,
	XAxisPrimitiveProps,
	YAxisPrimitiveProps,
};

export {
	//,
	useGridPrimitive,
	useReferenceLinePrimitive,
	useSeriesPrimitive,
	useXAxisPrimitive,
	useYAxisPrimitive,
};
