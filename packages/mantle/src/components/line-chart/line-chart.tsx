"use client";

import type {
	ChartAccessibilityProps,
	ChartRootBaseProps,
	CopyButtonPrimitiveProps,
	GridPrimitiveProps,
	LegendPrimitiveProps,
	ReferenceLinePrimitiveProps,
	TooltipPrimitiveProps,
	XAxisPrimitiveProps,
	YAxisPrimitiveProps,
} from "../chart/primitive.js";
import type {
	ChartDatum,
	ChartDatumEvent,
	ContinuousXScale,
	CurveKind,
	PointShape,
	SeriesColor,
} from "../chart/types.js";
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
 * Props for {@link LineChart.Root}. Lines encode value by vertical position,
 * not length from a baseline, so the full y domain stays overridable via
 * `yDomain` — and lines never stack, so there is no `stacked` prop.
 */
type LineChartRootProps<TDatum extends ChartDatum = ChartDatum> = Omit<
	ChartRootBaseProps,
	"stacked"
> &
	ChartAccessibilityProps & {
		/** Rows of data; each `LineChart.Line` reads one numeric key per row. */
		data: readonly TDatum[];
		/** The key of each row's x value. */
		xKey: Extract<keyof TDatum, string>;
		/**
		 * Override the auto-detected x scale (`Date` values → `"time"`, numbers →
		 * `"linear"`, strings → `"point"`).
		 */
		xScale?: ContinuousXScale;
	};

/**
 * Props for {@link LineChart.Line}.
 */
type LineChartLineProps = {
	/** The row key this series reads its numeric values from. */
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
	 * Interpolation between points: `"linear"` (default), `"monotone"`
	 * (smoothed), or `"step"`.
	 */
	curve?: CurveKind;
	/**
	 * Draw point markers with a surface ring. Auto-hidden when points are
	 * denser than ~12px apart.
	 */
	markers?: boolean;
	/**
	 * Join across `null`/missing values instead of leaving gaps. Gaps are the
	 * default and usually correct.
	 */
	connectNulls?: boolean;
	/**
	 * The glyph the hover dot and canvas point markers wear: `"circle"` (default), `"square"`,
	 * `"triangle"`, or `"diamond"` — a redundant encoding alongside color that
	 * keeps series distinguishable without color vision.
	 */
	shape?: PointShape;
};

/**
 * Props for {@link LineChart.Grid}.
 */
type LineChartGridProps = GridPrimitiveProps;

/**
 * Props for {@link LineChart.XAxis}. The tick formatter receives the row's x
 * value — a `Date` on time scales, a number on linear scales, and the
 * category value on point scales.
 */
type LineChartXAxisProps = XAxisPrimitiveProps;

/**
 * Props for {@link LineChart.YAxis}.
 */
type LineChartYAxisProps = YAxisPrimitiveProps;

/**
 * Props for {@link LineChart.ReferenceLine}.
 */
type LineChartReferenceLineProps = ReferenceLinePrimitiveProps;

/**
 * Props for {@link LineChart.Tooltip}.
 */
type LineChartTooltipProps = TooltipPrimitiveProps;

/**
 * Props for {@link LineChart.Legend}.
 */
type LineChartLegendProps = LegendPrimitiveProps;

/**
 * Props for {@link LineChart.CopyButton}.
 */
type LineChartCopyButtonProps = CopyButtonPrimitiveProps;

/**
 * The root of a line chart: owns the data, the scales, the canvas renderer,
 * and the entire interaction contract (a crosshair snapped to the nearest x
 * with a tooltip reading every series, keyboard stepping with polite
 * announcements, an sr-only data table, Enter/Space + click activation).
 * Rendering is canvas with min/max decimation, so series of 100k+ points stay
 * smooth. Compose the chrome and series parts as children.
 *
 * @see https://mantle.ngrok.com/components/charts/line-chart#linechartroot
 *
 * @example
 * ```tsx
 * const data = [
 *   { time: new Date("2026-07-18T10:00:00Z"), p50: 120, p99: 480 },
 *   { time: new Date("2026-07-18T10:01:00Z"), p50: 132, p99: 510 },
 *   { time: new Date("2026-07-18T10:02:00Z"), p50: 101, p99: 460 },
 * ];
 *
 * <LineChart.Root data={data} xKey="time" aria-label="Request latency">
 *   <LineChart.Grid />
 *   <LineChart.XAxis />
 *   <LineChart.YAxis />
 *   <LineChart.Line dataKey="p50" label="p50" />
 *   <LineChart.Line dataKey="p99" label="p99" curve="monotone" />
 *   <LineChart.Tooltip />
 *   <LineChart.Legend />
 * </LineChart.Root>
 * ```
 */
const Root = <TDatum extends ChartDatum = ChartDatum>(props: LineChartRootProps<TDatum>) => (
	<ChartRootPrimitive kind="line" componentName="LineChart" slotName="line-chart" {...props} />
);

/**
 * One line series. Renders nothing itself — it registers the series with the
 * chart, which paints it on canvas. Compose one `Line` per series; `null` and
 * missing values render as gaps unless `connectNulls` joins across them.
 *
 * @see https://mantle.ngrok.com/components/charts/line-chart#linechartline
 *
 * @example
 * ```tsx
 * <LineChart.Root data={data} xKey="time" aria-label="Request latency">
 *   <LineChart.Grid />
 *   <LineChart.XAxis />
 *   <LineChart.YAxis />
 *   <LineChart.Line dataKey="p50" label="p50" />
 *   <LineChart.Line dataKey="p99" label="p99" curve="monotone" />
 *   <LineChart.Legend />
 * </LineChart.Root>
 * ```
 */
const Line = (props: LineChartLineProps) => useSeriesPrimitive("LineChart.Line", "line", props);

/**
 * Horizontal hairline gridlines behind the lines (renderless; painted on
 * canvas). Omit the part to omit the grid.
 *
 * @see https://mantle.ngrok.com/components/charts/line-chart#linechartgrid
 *
 * @example
 * ```tsx
 * <LineChart.Root data={data} xKey="time" aria-label="Request latency">
 *   <LineChart.Grid />
 *   <LineChart.XAxis />
 *   <LineChart.YAxis />
 *   <LineChart.Line dataKey="p50" label="p50" />
 *   <LineChart.Legend />
 * </LineChart.Root>
 * ```
 */
const Grid = (props: LineChartGridProps) => useGridPrimitive("LineChart.Grid", props);

/**
 * Tick labels along the bottom of the plot (renderless; painted on canvas).
 * Labels that would collide are skipped, never rotated.
 *
 * @see https://mantle.ngrok.com/components/charts/line-chart#linechartxaxis
 *
 * @example
 * ```tsx
 * <LineChart.Root data={data} xKey="time" aria-label="Request latency">
 *   <LineChart.Grid />
 *   <LineChart.XAxis tickFormat={(time) => (time instanceof Date ? time.toLocaleTimeString() : String(time))} />
 *   <LineChart.YAxis />
 *   <LineChart.Line dataKey="p50" label="p50" />
 *   <LineChart.Legend />
 * </LineChart.Root>
 * ```
 */
const XAxis = (props: LineChartXAxisProps) => useXAxisPrimitive("LineChart.XAxis", props);

/**
 * Value tick labels along the left of the plot (renderless; painted on
 * canvas). Ticks land on clean thousands-separated numbers.
 *
 * @see https://mantle.ngrok.com/components/charts/line-chart#linechartyaxis
 *
 * @example
 * ```tsx
 * <LineChart.Root data={data} xKey="time" aria-label="Request latency">
 *   <LineChart.Grid />
 *   <LineChart.XAxis />
 *   <LineChart.YAxis tickFormat={(value) => `${value}ms`} />
 *   <LineChart.Line dataKey="p50" label="p50" />
 *   <LineChart.Legend />
 * </LineChart.Root>
 * ```
 */
const YAxis = (props: LineChartYAxisProps) => useYAxisPrimitive("LineChart.YAxis", props);

/**
 * A dashed horizontal marker at a y value — an SLO threshold, a budget, a
 * limit (renderless; painted on canvas).
 *
 * @see https://mantle.ngrok.com/components/charts/line-chart#linechartreferenceline
 *
 * @example
 * ```tsx
 * <LineChart.Root data={data} xKey="time" aria-label="Request latency">
 *   <LineChart.Grid />
 *   <LineChart.XAxis />
 *   <LineChart.YAxis />
 *   <LineChart.Line dataKey="p50" label="p50" />
 *   <LineChart.ReferenceLine y={500} label="SLO" />
 *   <LineChart.Legend />
 * </LineChart.Root>
 * ```
 */
const ReferenceLine = (props: LineChartReferenceLineProps) =>
	useReferenceLinePrimitive("LineChart.ReferenceLine", props);

/**
 * Customizes the hover/keyboard tooltip readout. The tooltip itself is part
 * of `LineChart.Root`'s interaction contract and renders whether or not this
 * part is composed — compose it to format the label or values, append a
 * footer, or replace the content entirely via the render-prop `children`.
 *
 * @see https://mantle.ngrok.com/components/charts/line-chart#linecharttooltip
 *
 * @example
 * ```tsx
 * <LineChart.Root data={data} xKey="time" aria-label="Request latency">
 *   <LineChart.Grid />
 *   <LineChart.XAxis />
 *   <LineChart.YAxis />
 *   <LineChart.Line dataKey="p50" label="p50" />
 *   <LineChart.Tooltip valueFormat={(value) => `${value}ms`} footer="Click to view logs" />
 *   <LineChart.Legend />
 * </LineChart.Root>
 * ```
 */
const Tooltip = (props: LineChartTooltipProps) => useTooltipPrimitive("LineChart.Tooltip", props);

/**
 * The legend: series names keyed by color swatches, rendered as real DOM in
 * flow below the plot. Always compose it on multi-series charts — identity
 * must never rely on color-matching alone. It renders nothing for a single
 * series (the chart's title already names it).
 *
 * @see https://mantle.ngrok.com/components/charts/line-chart#linechartlegend
 *
 * @example
 * ```tsx
 * <LineChart.Root data={data} xKey="time" aria-label="Request latency">
 *   <LineChart.Grid />
 *   <LineChart.XAxis />
 *   <LineChart.YAxis />
 *   <LineChart.Line dataKey="p50" label="p50" />
 *   <LineChart.Line dataKey="p99" label="p99" curve="monotone" />
 *   <LineChart.Legend />
 * </LineChart.Root>
 * ```
 */
const Legend = (props: LineChartLegendProps) => (
	<ChartLegendPrimitive partName="LineChart.Legend" slotName="line-chart" {...props} />
);

/**
 * A button that copies the chart's current data to the clipboard as a
 * markdown table (ISO dates, plain numbers, one column per series) —
 * pasteable into Slack, issues, docs, spreadsheets, and LLM chats. Renders
 * in flow where composed (alongside `Legend`, below the plot); `Root` is
 * relatively positioned, so `className` can dock it over a corner instead
 * (e.g. `absolute right-0 top-0`).
 *
 * @see https://mantle.ngrok.com/components/charts/line-chart#linechartcopybutton
 *
 * @example
 * ```tsx
 * <LineChart.Root data={data} xKey="time" aria-label="Request latency">
 *   <LineChart.Line dataKey="p50" label="p50" />
 *   <LineChart.Line dataKey="p99" label="p99" />
 *   <LineChart.Legend />
 *   <LineChart.CopyButton />
 * </LineChart.Root>
 * ```
 */
const CopyButton = (props: LineChartCopyButtonProps) => (
	<ChartCopyButtonPrimitive partName="LineChart.CopyButton" slotName="line-chart" {...props} />
);

/**
 * A canvas-rendered line chart for trends over a continuous x — time above
 * all. Series colors come from the theme's validated `--color-chart-*`
 * tokens; lines keep a fixed slot color for the chart's lifetime even as
 * other series are filtered in and out. Interaction — a crosshair snapped to
 * the nearest x with an every-series tooltip, keyboard stepping, aria-live
 * announcements, and an sr-only data table — ships with `Root`
 * unconditionally. Min/max decimation keeps 100k+ point series smooth.
 *
 * @see https://mantle.ngrok.com/components/charts/line-chart
 *
 * @example
 * Composition:
 * ```
 * LineChart.Root
 * ├── LineChart.Grid
 * ├── LineChart.XAxis
 * ├── LineChart.YAxis
 * ├── LineChart.Line (one per series)
 * ├── LineChart.ReferenceLine
 * ├── LineChart.Tooltip
 * ├── LineChart.Legend
 * └── LineChart.CopyButton
 * ```
 *
 * @example
 * ```tsx
 * const data = [
 *   { time: new Date("2026-07-18T10:00:00Z"), p50: 120, p99: 480 },
 *   { time: new Date("2026-07-18T10:01:00Z"), p50: 132, p99: 510 },
 *   { time: new Date("2026-07-18T10:02:00Z"), p50: 101, p99: 460 },
 * ];
 *
 * <LineChart.Root data={data} xKey="time" aria-label="Request latency">
 *   <LineChart.Grid />
 *   <LineChart.XAxis />
 *   <LineChart.YAxis />
 *   <LineChart.Line dataKey="p50" label="p50" />
 *   <LineChart.Line dataKey="p99" label="p99" curve="monotone" />
 *   <LineChart.Tooltip />
 *   <LineChart.Legend />
 * </LineChart.Root>
 * ```
 */
const LineChart = {
	/**
	 * The root of a line chart: owns the data, the scales, the canvas renderer,
	 * and the entire interaction contract.
	 *
	 * @see https://mantle.ngrok.com/components/charts/line-chart#linechartroot
	 *
	 * @example
	 * ```tsx
	 * <LineChart.Root data={data} xKey="time" aria-label="Request latency">
	 *   <LineChart.Grid />
	 *   <LineChart.XAxis />
	 *   <LineChart.YAxis />
	 *   <LineChart.Line dataKey="p50" label="p50" />
	 *   <LineChart.Line dataKey="p99" label="p99" curve="monotone" />
	 *   <LineChart.Tooltip />
	 *   <LineChart.Legend />
	 * </LineChart.Root>
	 * ```
	 */
	Root,
	/**
	 * One line series; registers with the chart and paints on canvas.
	 *
	 * @see https://mantle.ngrok.com/components/charts/line-chart#linechartline
	 *
	 * @example
	 * ```tsx
	 * <LineChart.Root data={data} xKey="time" aria-label="Request latency">
	 *   <LineChart.Grid />
	 *   <LineChart.XAxis />
	 *   <LineChart.YAxis />
	 *   <LineChart.Line dataKey="p50" label="p50" />
	 *   <LineChart.Line dataKey="p99" label="p99" curve="monotone" />
	 *   <LineChart.Tooltip />
	 *   <LineChart.Legend />
	 * </LineChart.Root>
	 * ```
	 */
	Line,
	/**
	 * Hairline gridlines behind the lines.
	 *
	 * @see https://mantle.ngrok.com/components/charts/line-chart#linechartgrid
	 *
	 * @example
	 * ```tsx
	 * <LineChart.Root data={data} xKey="time" aria-label="Request latency">
	 *   <LineChart.Grid />
	 *   <LineChart.XAxis />
	 *   <LineChart.YAxis />
	 *   <LineChart.Line dataKey="p50" label="p50" />
	 *   <LineChart.Line dataKey="p99" label="p99" curve="monotone" />
	 *   <LineChart.Tooltip />
	 *   <LineChart.Legend />
	 * </LineChart.Root>
	 * ```
	 */
	Grid,
	/**
	 * Tick labels along the bottom of the plot.
	 *
	 * @see https://mantle.ngrok.com/components/charts/line-chart#linechartxaxis
	 *
	 * @example
	 * ```tsx
	 * <LineChart.Root data={data} xKey="time" aria-label="Request latency">
	 *   <LineChart.Grid />
	 *   <LineChart.XAxis tickFormat={(time) => (time instanceof Date ? time.toLocaleTimeString() : String(time))} />
	 *   <LineChart.YAxis />
	 *   <LineChart.Line dataKey="p50" label="p50" />
	 *   <LineChart.Line dataKey="p99" label="p99" curve="monotone" />
	 *   <LineChart.Tooltip />
	 *   <LineChart.Legend />
	 * </LineChart.Root>
	 * ```
	 */
	XAxis,
	/**
	 * Value tick labels along the left of the plot.
	 *
	 * @see https://mantle.ngrok.com/components/charts/line-chart#linechartyaxis
	 *
	 * @example
	 * ```tsx
	 * <LineChart.Root data={data} xKey="time" aria-label="Request latency">
	 *   <LineChart.Grid />
	 *   <LineChart.XAxis />
	 *   <LineChart.YAxis tickFormat={(value) => `${value}ms`} />
	 *   <LineChart.Line dataKey="p50" label="p50" />
	 *   <LineChart.Line dataKey="p99" label="p99" curve="monotone" />
	 *   <LineChart.Tooltip />
	 *   <LineChart.Legend />
	 * </LineChart.Root>
	 * ```
	 */
	YAxis,
	/**
	 * A dashed horizontal marker at a y value (threshold, budget, limit).
	 *
	 * @see https://mantle.ngrok.com/components/charts/line-chart#linechartreferenceline
	 *
	 * @example
	 * ```tsx
	 * <LineChart.Root data={data} xKey="time" aria-label="Request latency">
	 *   <LineChart.Grid />
	 *   <LineChart.XAxis />
	 *   <LineChart.YAxis />
	 *   <LineChart.Line dataKey="p50" label="p50" />
	 *   <LineChart.ReferenceLine y={500} label="SLO" />
	 *   <LineChart.Tooltip />
	 *   <LineChart.Legend />
	 * </LineChart.Root>
	 * ```
	 */
	ReferenceLine,
	/**
	 * Customizes the always-on hover/keyboard tooltip readout.
	 *
	 * @see https://mantle.ngrok.com/components/charts/line-chart#linecharttooltip
	 *
	 * @example
	 * ```tsx
	 * <LineChart.Root data={data} xKey="time" aria-label="Request latency">
	 *   <LineChart.Grid />
	 *   <LineChart.XAxis />
	 *   <LineChart.YAxis />
	 *   <LineChart.Line dataKey="p50" label="p50" />
	 *   <LineChart.Line dataKey="p99" label="p99" curve="monotone" />
	 *   <LineChart.Tooltip valueFormat={(value) => `${value}ms`} />
	 *   <LineChart.Legend />
	 * </LineChart.Root>
	 * ```
	 */
	Tooltip,
	/**
	 * The legend; always compose it on multi-series charts. Renders nothing for
	 * a single series.
	 *
	 * @see https://mantle.ngrok.com/components/charts/line-chart#linechartlegend
	 *
	 * @example
	 * ```tsx
	 * <LineChart.Root data={data} xKey="time" aria-label="Request latency">
	 *   <LineChart.Grid />
	 *   <LineChart.XAxis />
	 *   <LineChart.YAxis />
	 *   <LineChart.Line dataKey="p50" label="p50" />
	 *   <LineChart.Line dataKey="p99" label="p99" curve="monotone" />
	 *   <LineChart.Tooltip />
	 *   <LineChart.Legend />
	 * </LineChart.Root>
	 * ```
	 */
	Legend,
	/**
	 * Copies the chart's current data to the clipboard as a markdown table.
	 *
	 * @see https://mantle.ngrok.com/components/charts/line-chart#linechartcopybutton
	 *
	 * @example
	 * ```tsx
	 * <LineChart.Root data={data} xKey="time" aria-label="Request latency">
	 *   <LineChart.Line dataKey="p50" label="p50" />
	 *   <LineChart.Line dataKey="p99" label="p99" />
	 *   <LineChart.Legend />
	 *   <LineChart.CopyButton />
	 * </LineChart.Root>
	 * ```
	 */
	CopyButton,
} as const;

export type {
	//,
	ChartDatumEvent,
	LineChartCopyButtonProps,
	LineChartGridProps,
	LineChartLegendProps,
	LineChartLineProps,
	LineChartReferenceLineProps,
	LineChartRootProps,
	LineChartTooltipProps,
	LineChartXAxisProps,
	LineChartYAxisProps,
};
export {
	//,
	LineChart,
};
