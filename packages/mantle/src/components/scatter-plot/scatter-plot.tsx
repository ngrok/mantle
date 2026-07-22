"use client";

import type {
	ChartAccessibleName,
	ChartRootBaseProps,
	CopyButtonPrimitiveProps,
	GridPrimitiveProps,
	LegendPrimitiveProps,
	ReferenceLinePrimitiveProps,
	TooltipPrimitiveProps,
	XAxisPrimitiveProps,
	YAxisPrimitiveProps,
} from "../chart/primitive.js";
import type { ChartDatum, ChartDatumEvent, PointShape, SeriesColor } from "../chart/types.js";
import {
	ChartCopyButtonPrimitive,
	ChartLegendPrimitive,
	ChartRootPrimitive,
	useGridPrimitive,
	useReferenceLinePrimitive,
	useSeriesPrimitive,
	useTooltipPrimitive,
	useXAxisPrimitive,
	useYAxisPrimitive,
} from "../chart/primitive.js";

/**
 * Props for {@link ScatterPlot.Root}. Scatter x values must be continuous
 * (numbers or `Date`s — there is no categorical scatter axis). Providing
 * `zKey` switches the chart into the 3D projection: points render inside a
 * rotatable cube (drag to orbit), depth-sorted with gentle perspective.
 *
 * Scatter is an all-pairs chart form — any two marks can sit side by side —
 * so with the default chart tokens keep it to FOUR series or fewer; beyond
 * that, fold into an "Other" series or facet into small multiples.
 */
type ScatterPlotRootProps<TDatum extends ChartDatum = ChartDatum> = Omit<
	ChartRootBaseProps,
	"stacked"
> &
	ChartAccessibleName & {
		/** Rows of data; each row is one point per composed `ScatterPlot.Point` series. */
		data: readonly TDatum[];
		/** The key of each row's x value (number or `Date`). */
		xKey: Extract<keyof TDatum, string>;
		/** Override the auto-detected x scale (`Date` values → `"time"`, numbers → `"linear"`). */
		xScale?: "linear" | "time";
	} & ScatterPlotDepthProps<TDatum>;

/**
 * The 3D half of {@link ScatterPlot.Root}'s props: `dimensions` only means
 * something in the 3D projection, so it is only representable alongside
 * `zKey`.
 */
type ScatterPlotDepthProps<TDatum extends ChartDatum = ChartDatum> =
	| {
			/**
			 * The key of each row's depth value. Providing it renders the scatter in
			 * 3D: drag the plot to rotate the cube. Axis parts and reference lines
			 * apply to the 2D projection only and are ignored in 3D (the cube frame
			 * carries orientation).
			 */
			zKey: Extract<keyof TDatum, string>;
			/**
			 * How many axes the cloud currently occupies (default `3`). Changing it
			 * morphs the points onto the x axis line (`1`), the xy plane (`2`), or
			 * the full cube (`3`) with a smooth glide — the pattern behind "click
			 * 1D/2D/3D to see the clusters separate" explainers. The y and z frame
			 * edges fade in with their dimension.
			 */
			dimensions?: 1 | 2 | 3;
	  }
	| {
			zKey?: never;
			dimensions?: never;
	  };

/**
 * Props for {@link ScatterPlot.Point}.
 */
type ScatterPlotPointProps = {
	/** The row key this series reads its y values from. */
	dataKey: string;
	/** Display name for the legend, tooltip, and data table. Defaults to `dataKey`. */
	label?: string;
	/**
	 * One of the validated chart tokens (`"chart-1"`…`"chart-8"`, `"chart-other"`)
	 * or any CSS color as an escape hatch. Defaults to the next sticky slot in
	 * mount order. Static colors (raw hex) do not adapt across themes; custom
	 * palettes must be validated for colorblind-safe adjacency and surface
	 * contrast, and a series that carries good/bad meaning should wear the
	 * semantic status colors, never a categorical slot.
	 */
	color?: SeriesColor;
	/**
	 * The glyph this series' points wear: `"circle"` (default), `"square"`,
	 * `"triangle"`, or `"diamond"`. Give each series a distinct shape on
	 * multi-series scatters — shape is the redundant encoding that keeps
	 * overlapping clouds distinguishable without color vision. The legend key
	 * and hover dot mirror it.
	 */
	shape?: PointShape;
};

/**
 * Props for {@link ScatterPlot.Grid}.
 */
type ScatterPlotGridProps = GridPrimitiveProps;

/**
 * Props for {@link ScatterPlot.XAxis}.
 */
type ScatterPlotXAxisProps = XAxisPrimitiveProps;

/**
 * Props for {@link ScatterPlot.YAxis}.
 */
type ScatterPlotYAxisProps = YAxisPrimitiveProps;

/**
 * Props for {@link ScatterPlot.ReferenceLine}.
 */
type ScatterPlotReferenceLineProps = ReferenceLinePrimitiveProps;

/**
 * Props for {@link ScatterPlot.Tooltip}.
 */
type ScatterPlotTooltipProps = TooltipPrimitiveProps;

/**
 * Props for {@link ScatterPlot.Legend}.
 */
type ScatterPlotLegendProps = LegendPrimitiveProps;

/**
 * Props for {@link ScatterPlot.CopyButton}.
 */
type ScatterPlotCopyButtonProps = CopyButtonPrimitiveProps;

/**
 * The root of a scatter plot: owns the data, the scales, the canvas
 * renderer, and the entire interaction contract. Hovering hits the nearest
 * point within 24px (never a pinpoint target); the tooltip reads that point's
 * series, x, y — and z in 3D. With `zKey` the plot becomes a rotatable 3D
 * cube: drag to orbit, with points depth-sorted under gentle perspective.
 *
 * @see https://mantle.ngrok.com/components/charts/scatter-plot#scatterplotroot
 *
 * @example
 * ```tsx
 * const data = [
 *   { latency: 12, throughputA: 840, throughputB: 720 },
 *   { latency: 28, throughputA: 610, throughputB: 590 },
 *   { latency: 45, throughputA: 340, throughputB: 410 },
 * ];
 *
 * <ScatterPlot.Root data={data} xKey="latency" aria-label="Latency vs throughput">
 *   <ScatterPlot.Grid />
 *   <ScatterPlot.XAxis />
 *   <ScatterPlot.YAxis />
 *   <ScatterPlot.Point dataKey="throughputA" label="Region A" />
 *   <ScatterPlot.Point dataKey="throughputB" label="Region B" />
 *   <ScatterPlot.Tooltip />
 *   <ScatterPlot.Legend />
 * </ScatterPlot.Root>
 * ```
 */
const Root = <TDatum extends ChartDatum = ChartDatum>(props: ScatterPlotRootProps<TDatum>) => (
	<ChartRootPrimitive
		kind="scatter"
		componentName="ScatterPlot"
		slotName="scatter-plot"
		{...props}
	/>
);

/**
 * One point series. Renders nothing itself — it registers the series with the
 * chart, which paints its points on canvas (r≥4 dots with a surface ring,
 * degrading gracefully past thousands of points).
 *
 * @see https://mantle.ngrok.com/components/charts/scatter-plot#scatterplotpoint
 *
 * @example
 * ```tsx
 * <ScatterPlot.Root data={data} xKey="latency" aria-label="Latency vs throughput">
 *   <ScatterPlot.Grid />
 *   <ScatterPlot.XAxis />
 *   <ScatterPlot.YAxis />
 *   <ScatterPlot.Point dataKey="throughputA" label="Region A" />
 *   <ScatterPlot.Point dataKey="throughputB" label="Region B" />
 *   <ScatterPlot.Tooltip />
 *   <ScatterPlot.Legend />
 * </ScatterPlot.Root>
 * ```
 */
const Point = (props: ScatterPlotPointProps) =>
	useSeriesPrimitive("ScatterPlot.Point", "scatter", props);

/**
 * Hairline gridlines behind the points (renderless; painted on canvas; 2D
 * only — the 3D cube frame carries orientation). Omit the part to omit the
 * grid.
 *
 * @see https://mantle.ngrok.com/components/charts/scatter-plot#scatterplotgrid
 *
 * @example
 * ```tsx
 * <ScatterPlot.Root data={data} xKey="latency" aria-label="Latency vs throughput">
 *   <ScatterPlot.Grid lines="both" />
 *   <ScatterPlot.XAxis />
 *   <ScatterPlot.YAxis />
 *   <ScatterPlot.Point dataKey="throughputA" label="Region A" />
 *   <ScatterPlot.Legend />
 * </ScatterPlot.Root>
 * ```
 */
const Grid = (props: ScatterPlotGridProps) => useGridPrimitive("ScatterPlot.Grid", props);

/**
 * Value labels along the bottom of the plot (renderless; painted on canvas;
 * 2D only). Labels that would collide are skipped, never rotated.
 *
 * @see https://mantle.ngrok.com/components/charts/scatter-plot#scatterplotxaxis
 *
 * @example
 * ```tsx
 * <ScatterPlot.Root data={data} xKey="latency" aria-label="Latency vs throughput">
 *   <ScatterPlot.Grid />
 *   <ScatterPlot.XAxis tickFormat={(value) => `${value}ms`} />
 *   <ScatterPlot.YAxis />
 *   <ScatterPlot.Point dataKey="throughputA" label="Region A" />
 *   <ScatterPlot.Legend />
 * </ScatterPlot.Root>
 * ```
 */
const XAxis = (props: ScatterPlotXAxisProps) => useXAxisPrimitive("ScatterPlot.XAxis", props);

/**
 * Value tick labels along the left of the plot (renderless; painted on
 * canvas; 2D only). Ticks land on clean thousands-separated numbers.
 *
 * @see https://mantle.ngrok.com/components/charts/scatter-plot#scatterplotyaxis
 *
 * @example
 * ```tsx
 * <ScatterPlot.Root data={data} xKey="latency" aria-label="Latency vs throughput">
 *   <ScatterPlot.Grid />
 *   <ScatterPlot.XAxis />
 *   <ScatterPlot.YAxis tickFormat={(value) => `${value / 1000}k`} />
 *   <ScatterPlot.Point dataKey="throughputA" label="Region A" />
 *   <ScatterPlot.Legend />
 * </ScatterPlot.Root>
 * ```
 */
const YAxis = (props: ScatterPlotYAxisProps) => useYAxisPrimitive("ScatterPlot.YAxis", props);

/**
 * A dashed horizontal marker at a y value (renderless; painted on canvas; 2D
 * only — ignored in the 3D projection).
 *
 * @see https://mantle.ngrok.com/components/charts/scatter-plot#scatterplotreferenceline
 *
 * @example
 * ```tsx
 * <ScatterPlot.Root data={data} xKey="latency" aria-label="Latency vs throughput">
 *   <ScatterPlot.Grid />
 *   <ScatterPlot.XAxis />
 *   <ScatterPlot.YAxis />
 *   <ScatterPlot.Point dataKey="throughputA" label="Region A" />
 *   <ScatterPlot.ReferenceLine y={500} label="Target" />
 *   <ScatterPlot.Legend />
 * </ScatterPlot.Root>
 * ```
 */
const ReferenceLine = (props: ScatterPlotReferenceLineProps) =>
	useReferenceLinePrimitive("ScatterPlot.ReferenceLine", props);

/**
 * Customizes the hover/keyboard tooltip readout. The tooltip itself is part
 * of `ScatterPlot.Root`'s interaction contract and renders whether or not
 * this part is composed — compose it to format the label or values, append a
 * footer, or replace the content entirely via the render-prop `children`.
 * In 3D the readout also carries the point's z value.
 *
 * @see https://mantle.ngrok.com/components/charts/scatter-plot#scatterplottooltip
 *
 * @example
 * ```tsx
 * <ScatterPlot.Root data={data} xKey="latency" aria-label="Latency vs throughput">
 *   <ScatterPlot.Point dataKey="throughputA" label="Region A" />
 *   <ScatterPlot.Tooltip valueFormat={(value) => `${value} rps`} />
 *   <ScatterPlot.Legend />
 * </ScatterPlot.Root>
 * ```
 */
const Tooltip = (props: ScatterPlotTooltipProps) =>
	useTooltipPrimitive("ScatterPlot.Tooltip", props);

/**
 * The legend: series names keyed by color dots, rendered as real DOM in flow
 * below the plot. Always compose it on multi-series charts — identity must
 * never rely on color-matching alone. It renders nothing for a single series
 * (the chart's title already names it).
 *
 * @see https://mantle.ngrok.com/components/charts/scatter-plot#scatterplotlegend
 *
 * @example
 * ```tsx
 * <ScatterPlot.Root data={data} xKey="latency" aria-label="Latency vs throughput">
 *   <ScatterPlot.Point dataKey="throughputA" label="Region A" />
 *   <ScatterPlot.Point dataKey="throughputB" label="Region B" />
 *   <ScatterPlot.Tooltip />
 *   <ScatterPlot.Legend />
 * </ScatterPlot.Root>
 * ```
 */
const Legend = (props: ScatterPlotLegendProps) => (
	<ChartLegendPrimitive partName="ScatterPlot.Legend" slotName="scatter-plot" {...props} />
);

/**
 * A button that copies the chart's current data to the clipboard as a
 * markdown table (ISO dates, plain numbers, one column per series, plus the
 * z column on 3D scatters) — pasteable into Slack, issues, docs,
 * spreadsheets, and LLM chats. Renders in flow where composed (alongside
 * `Legend`, below the plot); `Root` is relatively positioned, so `className`
 * can dock it over a corner instead (e.g. `absolute right-0 top-0`).
 *
 * @see https://mantle.ngrok.com/components/charts/scatter-plot#scatterplotcopybutton
 *
 * @example
 * ```tsx
 * <ScatterPlot.Root data={data} xKey="latency" aria-label="Latency vs throughput">
 *   <ScatterPlot.Point dataKey="throughputA" label="Region A" />
 *   <ScatterPlot.Point dataKey="throughputB" label="Region B" />
 *   <ScatterPlot.Legend />
 *   <ScatterPlot.CopyButton />
 * </ScatterPlot.Root>
 * ```
 */
const CopyButton = (props: ScatterPlotCopyButtonProps) => (
	<ChartCopyButtonPrimitive partName="ScatterPlot.CopyButton" slotName="scatter-plot" {...props} />
);

/**
 * A canvas-rendered scatter plot for correlating two measures — three with
 * the 3D projection (`zKey`), which renders a rotatable, depth-sorted point
 * cloud (drag to orbit). Hover hits the nearest point within 24px; keyboard
 * stepping, polite announcements, and the sr-only data table ship with `Root`
 * unconditionally. Scatter is an all-pairs chart form: with the default chart
 * tokens keep it to four series or fewer.
 *
 * @see https://mantle.ngrok.com/components/charts/scatter-plot
 *
 * @example
 * Composition:
 * ```
 * ScatterPlot.Root
 * ├── ScatterPlot.Grid
 * ├── ScatterPlot.XAxis
 * ├── ScatterPlot.YAxis
 * ├── ScatterPlot.Point (one per series)
 * ├── ScatterPlot.ReferenceLine
 * ├── ScatterPlot.Tooltip
 * └── ScatterPlot.Legend
 * ```
 *
 * @example
 * ```tsx
 * const data = [
 *   { latency: 12, throughputA: 840, throughputB: 720 },
 *   { latency: 28, throughputA: 610, throughputB: 590 },
 *   { latency: 45, throughputA: 340, throughputB: 410 },
 * ];
 *
 * <ScatterPlot.Root data={data} xKey="latency" aria-label="Latency vs throughput">
 *   <ScatterPlot.Grid />
 *   <ScatterPlot.XAxis />
 *   <ScatterPlot.YAxis />
 *   <ScatterPlot.Point dataKey="throughputA" label="Region A" />
 *   <ScatterPlot.Point dataKey="throughputB" label="Region B" />
 *   <ScatterPlot.Tooltip />
 *   <ScatterPlot.Legend />
 * </ScatterPlot.Root>
 * ```
 */
const ScatterPlot = {
	/**
	 * The root of a scatter plot: owns the data, the scales, the canvas
	 * renderer, and the entire interaction contract. `zKey` enables the 3D
	 * projection (drag to rotate).
	 *
	 * @see https://mantle.ngrok.com/components/charts/scatter-plot#scatterplotroot
	 *
	 * @example
	 * ```tsx
	 * <ScatterPlot.Root data={data} xKey="latency" aria-label="Latency vs throughput">
	 *   <ScatterPlot.Grid />
	 *   <ScatterPlot.XAxis />
	 *   <ScatterPlot.YAxis />
	 *   <ScatterPlot.Point dataKey="throughputA" label="Region A" />
	 *   <ScatterPlot.Point dataKey="throughputB" label="Region B" />
	 *   <ScatterPlot.Tooltip />
	 *   <ScatterPlot.Legend />
	 * </ScatterPlot.Root>
	 * ```
	 */
	Root,
	/**
	 * One point series; registers with the chart and paints on canvas.
	 *
	 * @see https://mantle.ngrok.com/components/charts/scatter-plot#scatterplotpoint
	 *
	 * @example
	 * ```tsx
	 * <ScatterPlot.Root data={data} xKey="latency" aria-label="Latency vs throughput">
	 *   <ScatterPlot.Grid />
	 *   <ScatterPlot.XAxis />
	 *   <ScatterPlot.YAxis />
	 *   <ScatterPlot.Point dataKey="throughputA" label="Region A" />
	 *   <ScatterPlot.Point dataKey="throughputB" label="Region B" />
	 *   <ScatterPlot.Tooltip />
	 *   <ScatterPlot.Legend />
	 * </ScatterPlot.Root>
	 * ```
	 */
	Point,
	/**
	 * Hairline gridlines behind the points (2D only).
	 *
	 * @see https://mantle.ngrok.com/components/charts/scatter-plot#scatterplotgrid
	 *
	 * @example
	 * ```tsx
	 * <ScatterPlot.Root data={data} xKey="latency" aria-label="Latency vs throughput">
	 *   <ScatterPlot.Grid lines="both" />
	 *   <ScatterPlot.XAxis />
	 *   <ScatterPlot.YAxis />
	 *   <ScatterPlot.Point dataKey="throughputA" label="Region A" />
	 *   <ScatterPlot.Tooltip />
	 *   <ScatterPlot.Legend />
	 * </ScatterPlot.Root>
	 * ```
	 */
	Grid,
	/**
	 * Value labels along the bottom of the plot (2D only).
	 *
	 * @see https://mantle.ngrok.com/components/charts/scatter-plot#scatterplotxaxis
	 *
	 * @example
	 * ```tsx
	 * <ScatterPlot.Root data={data} xKey="latency" aria-label="Latency vs throughput">
	 *   <ScatterPlot.Grid />
	 *   <ScatterPlot.XAxis tickFormat={(value) => `${value}ms`} />
	 *   <ScatterPlot.YAxis />
	 *   <ScatterPlot.Point dataKey="throughputA" label="Region A" />
	 *   <ScatterPlot.Tooltip />
	 *   <ScatterPlot.Legend />
	 * </ScatterPlot.Root>
	 * ```
	 */
	XAxis,
	/**
	 * Value tick labels along the left of the plot (2D only).
	 *
	 * @see https://mantle.ngrok.com/components/charts/scatter-plot#scatterplotyaxis
	 *
	 * @example
	 * ```tsx
	 * <ScatterPlot.Root data={data} xKey="latency" aria-label="Latency vs throughput">
	 *   <ScatterPlot.Grid />
	 *   <ScatterPlot.XAxis />
	 *   <ScatterPlot.YAxis tickFormat={(value) => `${value / 1000}k`} />
	 *   <ScatterPlot.Point dataKey="throughputA" label="Region A" />
	 *   <ScatterPlot.Tooltip />
	 *   <ScatterPlot.Legend />
	 * </ScatterPlot.Root>
	 * ```
	 */
	YAxis,
	/**
	 * A dashed horizontal marker at a y value (2D only).
	 *
	 * @see https://mantle.ngrok.com/components/charts/scatter-plot#scatterplotreferenceline
	 *
	 * @example
	 * ```tsx
	 * <ScatterPlot.Root data={data} xKey="latency" aria-label="Latency vs throughput">
	 *   <ScatterPlot.Grid />
	 *   <ScatterPlot.XAxis />
	 *   <ScatterPlot.YAxis />
	 *   <ScatterPlot.Point dataKey="throughputA" label="Region A" />
	 *   <ScatterPlot.ReferenceLine y={500} label="Target" />
	 *   <ScatterPlot.Tooltip />
	 *   <ScatterPlot.Legend />
	 * </ScatterPlot.Root>
	 * ```
	 */
	ReferenceLine,
	/**
	 * Customizes the always-on hover/keyboard tooltip readout (z included in 3D).
	 *
	 * @see https://mantle.ngrok.com/components/charts/scatter-plot#scatterplottooltip
	 *
	 * @example
	 * ```tsx
	 * <ScatterPlot.Root data={data} xKey="latency" aria-label="Latency vs throughput">
	 *   <ScatterPlot.Grid />
	 *   <ScatterPlot.XAxis />
	 *   <ScatterPlot.YAxis />
	 *   <ScatterPlot.Point dataKey="throughputA" label="Region A" />
	 *   <ScatterPlot.Tooltip valueFormat={(value) => `${value} rps`} />
	 *   <ScatterPlot.Legend />
	 * </ScatterPlot.Root>
	 * ```
	 */
	Tooltip,
	/**
	 * The legend; always compose it on multi-series charts. Renders nothing for
	 * a single series.
	 *
	 * @see https://mantle.ngrok.com/components/charts/scatter-plot#scatterplotlegend
	 *
	 * @example
	 * ```tsx
	 * <ScatterPlot.Root data={data} xKey="latency" aria-label="Latency vs throughput">
	 *   <ScatterPlot.Grid />
	 *   <ScatterPlot.XAxis />
	 *   <ScatterPlot.YAxis />
	 *   <ScatterPlot.Point dataKey="throughputA" label="Region A" />
	 *   <ScatterPlot.Point dataKey="throughputB" label="Region B" />
	 *   <ScatterPlot.Tooltip />
	 *   <ScatterPlot.Legend />
	 * </ScatterPlot.Root>
	 * ```
	 */
	Legend,
	/**
	 * Copies the chart's current data to the clipboard as a markdown table.
	 *
	 * @see https://mantle.ngrok.com/components/charts/scatter-plot#scatterplotcopybutton
	 *
	 * @example
	 * ```tsx
	 * <ScatterPlot.Root data={data} xKey="latency" aria-label="Latency vs throughput">
	 *   <ScatterPlot.Point dataKey="throughputA" label="Region A" />
	 *   <ScatterPlot.Point dataKey="throughputB" label="Region B" />
	 *   <ScatterPlot.Legend />
	 *   <ScatterPlot.CopyButton />
	 * </ScatterPlot.Root>
	 * ```
	 */
	CopyButton,
} as const;

export type {
	//,
	ChartDatumEvent,
	ScatterPlotCopyButtonProps,
	ScatterPlotGridProps,
	ScatterPlotLegendProps,
	ScatterPlotPointProps,
	ScatterPlotReferenceLineProps,
	ScatterPlotRootProps,
	ScatterPlotTooltipProps,
	ScatterPlotXAxisProps,
	ScatterPlotYAxisProps,
};
export {
	//,
	ScatterPlot,
};
