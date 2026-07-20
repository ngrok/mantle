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
import type { ChartDatum, ChartDatumEvent, SeriesColor } from "../chart/types.js";
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
 * Props for {@link ScatterChart.Root}. Scatter x values must be continuous
 * (numbers or `Date`s — there is no categorical scatter axis). Providing
 * `zKey` switches the chart into the 3D projection: points render inside a
 * rotatable cube (drag to orbit), depth-sorted with gentle perspective.
 *
 * Scatter is an all-pairs chart form — any two marks can sit side by side —
 * so with the default chart tokens keep it to FOUR series or fewer; beyond
 * that, fold into an "Other" series or facet into small multiples.
 */
type ScatterChartRootProps<TDatum extends ChartDatum = ChartDatum> = Omit<
	ChartRootBaseProps,
	"stacked"
> &
	ChartAccessibleName & {
		/** Rows of data; each row is one point per composed `ScatterChart.Point` series. */
		data: readonly TDatum[];
		/** The key of each row's x value (number or `Date`). */
		xKey: Extract<keyof TDatum, string>;
		/** Override the auto-detected x scale (`Date` values → `"time"`, numbers → `"linear"`). */
		xScale?: "linear" | "time";
	} & ScatterChartDepthProps<TDatum>;

/**
 * The 3D half of {@link ScatterChart.Root}'s props: `dimensions` only means
 * something in the 3D projection, so it is only representable alongside
 * `zKey`.
 */
type ScatterChartDepthProps<TDatum extends ChartDatum = ChartDatum> =
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
 * Props for {@link ScatterChart.Point}.
 */
type ScatterChartPointProps = {
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
};

/**
 * Props for {@link ScatterChart.Grid}.
 */
type ScatterChartGridProps = GridPrimitiveProps;

/**
 * Props for {@link ScatterChart.XAxis}.
 */
type ScatterChartXAxisProps = XAxisPrimitiveProps;

/**
 * Props for {@link ScatterChart.YAxis}.
 */
type ScatterChartYAxisProps = YAxisPrimitiveProps;

/**
 * Props for {@link ScatterChart.ReferenceLine}.
 */
type ScatterChartReferenceLineProps = ReferenceLinePrimitiveProps;

/**
 * Props for {@link ScatterChart.Tooltip}.
 */
type ScatterChartTooltipProps = TooltipPrimitiveProps;

/**
 * Props for {@link ScatterChart.Legend}.
 */
type ScatterChartLegendProps = LegendPrimitiveProps;

/**
 * Props for {@link ScatterChart.CopyButton}.
 */
type ScatterChartCopyButtonProps = CopyButtonPrimitiveProps;

/**
 * The root of a scatter chart: owns the data, the scales, the canvas
 * renderer, and the entire interaction contract. Hovering hits the nearest
 * point within 24px (never a pinpoint target); the tooltip reads that point's
 * series, x, y — and z in 3D. With `zKey` the plot becomes a rotatable 3D
 * cube: drag to orbit, with points depth-sorted under gentle perspective.
 *
 * @see https://mantle.ngrok.com/components/charts/scatter-chart#scatterchartroot
 *
 * @example
 * ```tsx
 * const data = [
 *   { latency: 12, throughputA: 840, throughputB: 720 },
 *   { latency: 28, throughputA: 610, throughputB: 590 },
 *   { latency: 45, throughputA: 340, throughputB: 410 },
 * ];
 *
 * <ScatterChart.Root data={data} xKey="latency" aria-label="Latency vs throughput">
 *   <ScatterChart.Grid />
 *   <ScatterChart.XAxis />
 *   <ScatterChart.YAxis />
 *   <ScatterChart.Point dataKey="throughputA" label="Region A" />
 *   <ScatterChart.Point dataKey="throughputB" label="Region B" />
 *   <ScatterChart.Tooltip />
 *   <ScatterChart.Legend />
 * </ScatterChart.Root>
 * ```
 */
const Root = <TDatum extends ChartDatum = ChartDatum>(props: ScatterChartRootProps<TDatum>) => (
	<ChartRootPrimitive
		kind="scatter"
		componentName="ScatterChart"
		slotName="scatter-chart"
		{...props}
	/>
);
Root.displayName = "ScatterChart";

/**
 * One point series. Renders nothing itself — it registers the series with the
 * chart, which paints its points on canvas (r≥4 dots with a surface ring,
 * degrading gracefully past thousands of points).
 *
 * @see https://mantle.ngrok.com/components/charts/scatter-chart#scatterchartpoint
 *
 * @example
 * ```tsx
 * <ScatterChart.Root data={data} xKey="latency" aria-label="Latency vs throughput">
 *   <ScatterChart.Grid />
 *   <ScatterChart.XAxis />
 *   <ScatterChart.YAxis />
 *   <ScatterChart.Point dataKey="throughputA" label="Region A" />
 *   <ScatterChart.Point dataKey="throughputB" label="Region B" />
 *   <ScatterChart.Tooltip />
 *   <ScatterChart.Legend />
 * </ScatterChart.Root>
 * ```
 */
const Point = (props: ScatterChartPointProps) =>
	useSeriesPrimitive("ScatterChart.Point", "scatter", props);
Point.displayName = "ScatterChartPoint";

/**
 * Hairline gridlines behind the points (renderless; painted on canvas; 2D
 * only — the 3D cube frame carries orientation). Omit the part to omit the
 * grid.
 *
 * @see https://mantle.ngrok.com/components/charts/scatter-chart#scatterchartgrid
 *
 * @example
 * ```tsx
 * <ScatterChart.Root data={data} xKey="latency" aria-label="Latency vs throughput">
 *   <ScatterChart.Grid lines="both" />
 *   <ScatterChart.XAxis />
 *   <ScatterChart.YAxis />
 *   <ScatterChart.Point dataKey="throughputA" label="Region A" />
 *   <ScatterChart.Legend />
 * </ScatterChart.Root>
 * ```
 */
const Grid = (props: ScatterChartGridProps) => useGridPrimitive("ScatterChart.Grid", props);
Grid.displayName = "ScatterChartGrid";

/**
 * Value labels along the bottom of the plot (renderless; painted on canvas;
 * 2D only). Labels that would collide are skipped, never rotated.
 *
 * @see https://mantle.ngrok.com/components/charts/scatter-chart#scatterchartxaxis
 *
 * @example
 * ```tsx
 * <ScatterChart.Root data={data} xKey="latency" aria-label="Latency vs throughput">
 *   <ScatterChart.Grid />
 *   <ScatterChart.XAxis tickFormat={(value) => `${value}ms`} />
 *   <ScatterChart.YAxis />
 *   <ScatterChart.Point dataKey="throughputA" label="Region A" />
 *   <ScatterChart.Legend />
 * </ScatterChart.Root>
 * ```
 */
const XAxis = (props: ScatterChartXAxisProps) => useXAxisPrimitive("ScatterChart.XAxis", props);
XAxis.displayName = "ScatterChartXAxis";

/**
 * Value tick labels along the left of the plot (renderless; painted on
 * canvas; 2D only). Ticks land on clean thousands-separated numbers.
 *
 * @see https://mantle.ngrok.com/components/charts/scatter-chart#scatterchartyaxis
 *
 * @example
 * ```tsx
 * <ScatterChart.Root data={data} xKey="latency" aria-label="Latency vs throughput">
 *   <ScatterChart.Grid />
 *   <ScatterChart.XAxis />
 *   <ScatterChart.YAxis tickFormat={(value) => `${value / 1000}k`} />
 *   <ScatterChart.Point dataKey="throughputA" label="Region A" />
 *   <ScatterChart.Legend />
 * </ScatterChart.Root>
 * ```
 */
const YAxis = (props: ScatterChartYAxisProps) => useYAxisPrimitive("ScatterChart.YAxis", props);
YAxis.displayName = "ScatterChartYAxis";

/**
 * A dashed horizontal marker at a y value (renderless; painted on canvas; 2D
 * only — ignored in the 3D projection).
 *
 * @see https://mantle.ngrok.com/components/charts/scatter-chart#scatterchartreferenceline
 *
 * @example
 * ```tsx
 * <ScatterChart.Root data={data} xKey="latency" aria-label="Latency vs throughput">
 *   <ScatterChart.Grid />
 *   <ScatterChart.XAxis />
 *   <ScatterChart.YAxis />
 *   <ScatterChart.Point dataKey="throughputA" label="Region A" />
 *   <ScatterChart.ReferenceLine y={500} label="Target" />
 *   <ScatterChart.Legend />
 * </ScatterChart.Root>
 * ```
 */
const ReferenceLine = (props: ScatterChartReferenceLineProps) =>
	useReferenceLinePrimitive("ScatterChart.ReferenceLine", props);
ReferenceLine.displayName = "ScatterChartReferenceLine";

/**
 * Customizes the hover/keyboard tooltip readout. The tooltip itself is part
 * of `ScatterChart.Root`'s interaction contract and renders whether or not
 * this part is composed — compose it to format the label or values, append a
 * footer, or replace the content entirely via the render-prop `children`.
 * In 3D the readout also carries the point's z value.
 *
 * @see https://mantle.ngrok.com/components/charts/scatter-chart#scattercharttooltip
 *
 * @example
 * ```tsx
 * <ScatterChart.Root data={data} xKey="latency" aria-label="Latency vs throughput">
 *   <ScatterChart.Point dataKey="throughputA" label="Region A" />
 *   <ScatterChart.Tooltip valueFormat={(value) => `${value} rps`} />
 *   <ScatterChart.Legend />
 * </ScatterChart.Root>
 * ```
 */
const Tooltip = (props: ScatterChartTooltipProps) =>
	useTooltipPrimitive("ScatterChart.Tooltip", props);
Tooltip.displayName = "ScatterChartTooltip";

/**
 * The legend: series names keyed by color dots, rendered as real DOM in flow
 * below the plot. Always compose it on multi-series charts — identity must
 * never rely on color-matching alone. It renders nothing for a single series
 * (the chart's title already names it).
 *
 * @see https://mantle.ngrok.com/components/charts/scatter-chart#scatterchartlegend
 *
 * @example
 * ```tsx
 * <ScatterChart.Root data={data} xKey="latency" aria-label="Latency vs throughput">
 *   <ScatterChart.Point dataKey="throughputA" label="Region A" />
 *   <ScatterChart.Point dataKey="throughputB" label="Region B" />
 *   <ScatterChart.Tooltip />
 *   <ScatterChart.Legend />
 * </ScatterChart.Root>
 * ```
 */
const Legend = (props: ScatterChartLegendProps) => (
	<ChartLegendPrimitive partName="ScatterChart.Legend" slotName="scatter-chart" {...props} />
);
Legend.displayName = "ScatterChartLegend";

/**
 * A button that copies the chart's current data to the clipboard as a
 * markdown table (ISO dates, plain numbers, one column per series, plus the
 * z column on 3D scatters) — pasteable into Slack, issues, docs,
 * spreadsheets, and LLM chats. Renders in flow where composed (alongside
 * `Legend`, below the plot); `Root` is relatively positioned, so `className`
 * can dock it over a corner instead (e.g. `absolute right-0 top-0`).
 *
 * @see https://mantle.ngrok.com/components/charts/scatter-chart#scatterchartcopybutton
 *
 * @example
 * ```tsx
 * <ScatterChart.Root data={data} xKey="latency" aria-label="Latency vs throughput">
 *   <ScatterChart.Point dataKey="throughputA" label="Region A" />
 *   <ScatterChart.Point dataKey="throughputB" label="Region B" />
 *   <ScatterChart.Legend />
 *   <ScatterChart.CopyButton />
 * </ScatterChart.Root>
 * ```
 */
const CopyButton = (props: ScatterChartCopyButtonProps) => (
	<ChartCopyButtonPrimitive
		partName="ScatterChart.CopyButton"
		slotName="scatter-chart"
		{...props}
	/>
);
CopyButton.displayName = "ScatterChartCopyButton";

/**
 * A canvas-rendered scatter chart for correlating two measures — three with
 * the 3D projection (`zKey`), which renders a rotatable, depth-sorted point
 * cloud (drag to orbit). Hover hits the nearest point within 24px; keyboard
 * stepping, polite announcements, and the sr-only data table ship with `Root`
 * unconditionally. Scatter is an all-pairs chart form: with the default chart
 * tokens keep it to four series or fewer.
 *
 * @see https://mantle.ngrok.com/components/charts/scatter-chart
 *
 * @example
 * Composition:
 * ```
 * ScatterChart.Root
 * ├── ScatterChart.Grid
 * ├── ScatterChart.XAxis
 * ├── ScatterChart.YAxis
 * ├── ScatterChart.Point (one per series)
 * ├── ScatterChart.ReferenceLine
 * ├── ScatterChart.Tooltip
 * └── ScatterChart.Legend
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
 * <ScatterChart.Root data={data} xKey="latency" aria-label="Latency vs throughput">
 *   <ScatterChart.Grid />
 *   <ScatterChart.XAxis />
 *   <ScatterChart.YAxis />
 *   <ScatterChart.Point dataKey="throughputA" label="Region A" />
 *   <ScatterChart.Point dataKey="throughputB" label="Region B" />
 *   <ScatterChart.Tooltip />
 *   <ScatterChart.Legend />
 * </ScatterChart.Root>
 * ```
 */
const ScatterChart = {
	/**
	 * The root of a scatter chart: owns the data, the scales, the canvas
	 * renderer, and the entire interaction contract. `zKey` enables the 3D
	 * projection (drag to rotate).
	 *
	 * @see https://mantle.ngrok.com/components/charts/scatter-chart#scatterchartroot
	 *
	 * @example
	 * ```tsx
	 * <ScatterChart.Root data={data} xKey="latency" aria-label="Latency vs throughput">
	 *   <ScatterChart.Grid />
	 *   <ScatterChart.XAxis />
	 *   <ScatterChart.YAxis />
	 *   <ScatterChart.Point dataKey="throughputA" label="Region A" />
	 *   <ScatterChart.Point dataKey="throughputB" label="Region B" />
	 *   <ScatterChart.Tooltip />
	 *   <ScatterChart.Legend />
	 * </ScatterChart.Root>
	 * ```
	 */
	Root,
	/**
	 * One point series; registers with the chart and paints on canvas.
	 *
	 * @see https://mantle.ngrok.com/components/charts/scatter-chart#scatterchartpoint
	 *
	 * @example
	 * ```tsx
	 * <ScatterChart.Root data={data} xKey="latency" aria-label="Latency vs throughput">
	 *   <ScatterChart.Grid />
	 *   <ScatterChart.XAxis />
	 *   <ScatterChart.YAxis />
	 *   <ScatterChart.Point dataKey="throughputA" label="Region A" />
	 *   <ScatterChart.Point dataKey="throughputB" label="Region B" />
	 *   <ScatterChart.Tooltip />
	 *   <ScatterChart.Legend />
	 * </ScatterChart.Root>
	 * ```
	 */
	Point,
	/**
	 * Hairline gridlines behind the points (2D only).
	 *
	 * @see https://mantle.ngrok.com/components/charts/scatter-chart#scatterchartgrid
	 *
	 * @example
	 * ```tsx
	 * <ScatterChart.Root data={data} xKey="latency" aria-label="Latency vs throughput">
	 *   <ScatterChart.Grid lines="both" />
	 *   <ScatterChart.XAxis />
	 *   <ScatterChart.YAxis />
	 *   <ScatterChart.Point dataKey="throughputA" label="Region A" />
	 *   <ScatterChart.Tooltip />
	 *   <ScatterChart.Legend />
	 * </ScatterChart.Root>
	 * ```
	 */
	Grid,
	/**
	 * Value labels along the bottom of the plot (2D only).
	 *
	 * @see https://mantle.ngrok.com/components/charts/scatter-chart#scatterchartxaxis
	 *
	 * @example
	 * ```tsx
	 * <ScatterChart.Root data={data} xKey="latency" aria-label="Latency vs throughput">
	 *   <ScatterChart.Grid />
	 *   <ScatterChart.XAxis tickFormat={(value) => `${value}ms`} />
	 *   <ScatterChart.YAxis />
	 *   <ScatterChart.Point dataKey="throughputA" label="Region A" />
	 *   <ScatterChart.Tooltip />
	 *   <ScatterChart.Legend />
	 * </ScatterChart.Root>
	 * ```
	 */
	XAxis,
	/**
	 * Value tick labels along the left of the plot (2D only).
	 *
	 * @see https://mantle.ngrok.com/components/charts/scatter-chart#scatterchartyaxis
	 *
	 * @example
	 * ```tsx
	 * <ScatterChart.Root data={data} xKey="latency" aria-label="Latency vs throughput">
	 *   <ScatterChart.Grid />
	 *   <ScatterChart.XAxis />
	 *   <ScatterChart.YAxis tickFormat={(value) => `${value / 1000}k`} />
	 *   <ScatterChart.Point dataKey="throughputA" label="Region A" />
	 *   <ScatterChart.Tooltip />
	 *   <ScatterChart.Legend />
	 * </ScatterChart.Root>
	 * ```
	 */
	YAxis,
	/**
	 * A dashed horizontal marker at a y value (2D only).
	 *
	 * @see https://mantle.ngrok.com/components/charts/scatter-chart#scatterchartreferenceline
	 *
	 * @example
	 * ```tsx
	 * <ScatterChart.Root data={data} xKey="latency" aria-label="Latency vs throughput">
	 *   <ScatterChart.Grid />
	 *   <ScatterChart.XAxis />
	 *   <ScatterChart.YAxis />
	 *   <ScatterChart.Point dataKey="throughputA" label="Region A" />
	 *   <ScatterChart.ReferenceLine y={500} label="Target" />
	 *   <ScatterChart.Tooltip />
	 *   <ScatterChart.Legend />
	 * </ScatterChart.Root>
	 * ```
	 */
	ReferenceLine,
	/**
	 * Customizes the always-on hover/keyboard tooltip readout (z included in 3D).
	 *
	 * @see https://mantle.ngrok.com/components/charts/scatter-chart#scattercharttooltip
	 *
	 * @example
	 * ```tsx
	 * <ScatterChart.Root data={data} xKey="latency" aria-label="Latency vs throughput">
	 *   <ScatterChart.Grid />
	 *   <ScatterChart.XAxis />
	 *   <ScatterChart.YAxis />
	 *   <ScatterChart.Point dataKey="throughputA" label="Region A" />
	 *   <ScatterChart.Tooltip valueFormat={(value) => `${value} rps`} />
	 *   <ScatterChart.Legend />
	 * </ScatterChart.Root>
	 * ```
	 */
	Tooltip,
	/**
	 * The legend; always compose it on multi-series charts. Renders nothing for
	 * a single series.
	 *
	 * @see https://mantle.ngrok.com/components/charts/scatter-chart#scatterchartlegend
	 *
	 * @example
	 * ```tsx
	 * <ScatterChart.Root data={data} xKey="latency" aria-label="Latency vs throughput">
	 *   <ScatterChart.Grid />
	 *   <ScatterChart.XAxis />
	 *   <ScatterChart.YAxis />
	 *   <ScatterChart.Point dataKey="throughputA" label="Region A" />
	 *   <ScatterChart.Point dataKey="throughputB" label="Region B" />
	 *   <ScatterChart.Tooltip />
	 *   <ScatterChart.Legend />
	 * </ScatterChart.Root>
	 * ```
	 */
	Legend,
	/**
	 * Copies the chart's current data to the clipboard as a markdown table.
	 *
	 * @see https://mantle.ngrok.com/components/charts/scatter-chart#scatterchartcopybutton
	 *
	 * @example
	 * ```tsx
	 * <ScatterChart.Root data={data} xKey="latency" aria-label="Latency vs throughput">
	 *   <ScatterChart.Point dataKey="throughputA" label="Region A" />
	 *   <ScatterChart.Point dataKey="throughputB" label="Region B" />
	 *   <ScatterChart.Legend />
	 *   <ScatterChart.CopyButton />
	 * </ScatterChart.Root>
	 * ```
	 */
	CopyButton,
} as const;

export type {
	//,
	ChartDatumEvent,
	ScatterChartCopyButtonProps,
	ScatterChartGridProps,
	ScatterChartLegendProps,
	ScatterChartPointProps,
	ScatterChartReferenceLineProps,
	ScatterChartRootProps,
	ScatterChartTooltipProps,
	ScatterChartXAxisProps,
	ScatterChartYAxisProps,
};
export {
	//,
	ScatterChart,
};
