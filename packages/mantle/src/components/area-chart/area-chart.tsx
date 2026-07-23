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
 * Props for {@link AreaChart.Root}. Areas fill from a shared zero baseline, so
 * the y domain minimum is fixed at `0` — a truncated-area axis is
 * unrepresentable.
 */
type AreaChartRootProps<TDatum extends ChartDatum = ChartDatum> = Omit<
	ChartRootBaseProps,
	"yDomain"
> &
	ChartAccessibilityProps & {
		/** Rows of data; each `AreaChart.Area` reads one numeric key per row. */
		data: readonly TDatum[];
		/** The key of each row's x value. */
		xKey: Extract<keyof TDatum, string>;
		/**
		 * Override the auto-detected x scale (`Date` values → `"time"`, numbers →
		 * `"linear"`, strings → `"point"`).
		 */
		xScale?: ContinuousXScale;
		/** Override the automatic y maximum. The minimum is always the zero baseline. */
		yDomain?: [0, number | "auto"];
	};

/**
 * Props for {@link AreaChart.Area}.
 */
type AreaChartAreaProps = {
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
	 * Join across `null`/missing values instead of leaving gaps. Gaps are the
	 * default and usually correct.
	 */
	connectNulls?: boolean;
	/**
	 * The glyph the hover dot wears: `"circle"` (default), `"square"`,
	 * `"triangle"`, or `"diamond"` — a redundant encoding alongside color that
	 * keeps series distinguishable without color vision.
	 */
	shape?: PointShape;
};

/**
 * Props for {@link AreaChart.Grid}.
 */
type AreaChartGridProps = GridPrimitiveProps;

/**
 * Props for {@link AreaChart.XAxis}. The tick formatter receives the row's x
 * value — the category value on point scales, a `Date` on time scales, and a
 * number on linear scales.
 */
type AreaChartXAxisProps = XAxisPrimitiveProps;

/**
 * Props for {@link AreaChart.YAxis}.
 */
type AreaChartYAxisProps = YAxisPrimitiveProps;

/**
 * Props for {@link AreaChart.ReferenceLine}.
 */
type AreaChartReferenceLineProps = ReferenceLinePrimitiveProps;

/**
 * Props for {@link AreaChart.Tooltip}.
 */
type AreaChartTooltipProps = TooltipPrimitiveProps;

/**
 * Props for {@link AreaChart.Legend}.
 */
type AreaChartLegendProps = LegendPrimitiveProps;

/**
 * Props for {@link AreaChart.CopyButton}.
 */
type AreaChartCopyButtonProps = CopyButtonPrimitiveProps;

/**
 * The root of an area chart: owns the data, the scales, the canvas renderer,
 * and the entire interaction contract (a crosshair with an every-series
 * tooltip, keyboard stepping with polite announcements, an sr-only data
 * table, Enter/Space + click activation). Areas fill with a 10% wash of the
 * series color plus a 2px band-edge stroke; `stacked` on the Root stacks the
 * composed series, the first series at the baseline. Large datasets decimate
 * before painting on canvas. Compose the chrome and series parts as children.
 *
 * @see https://mantle.ngrok.com/components/charts/area-chart#areachartroot
 *
 * @example
 * ```tsx
 * const data = [
 *   { date: new Date("2026-07-15"), http: 4200, tcp: 1400 },
 *   { date: new Date("2026-07-16"), http: 5100, tcp: 1650 },
 *   { date: new Date("2026-07-17"), http: 4700, tcp: 1500 },
 * ];
 *
 * <AreaChart.Root data={data} xKey="date" stacked aria-label="Traffic by protocol">
 *   <AreaChart.Grid />
 *   <AreaChart.XAxis />
 *   <AreaChart.YAxis />
 *   <AreaChart.Area dataKey="http" label="HTTP" />
 *   <AreaChart.Area dataKey="tcp" label="TCP" />
 *   <AreaChart.Tooltip />
 *   <AreaChart.Legend />
 * </AreaChart.Root>
 * ```
 */
const Root = <TDatum extends ChartDatum = ChartDatum>(props: AreaChartRootProps<TDatum>) => (
	<ChartRootPrimitive kind="area" componentName="AreaChart" slotName="area-chart" {...props} />
);

/**
 * One area series. Renders nothing itself — it registers the series with the
 * chart, which paints it on canvas. Compose one `Area` per series; with
 * `stacked` on the Root, areas stack in composition order with the first
 * series at the baseline.
 *
 * @see https://mantle.ngrok.com/components/charts/area-chart#areachartarea
 *
 * @example
 * ```tsx
 * <AreaChart.Root data={data} xKey="date" stacked aria-label="Traffic by protocol">
 *   <AreaChart.Grid />
 *   <AreaChart.XAxis />
 *   <AreaChart.YAxis />
 *   <AreaChart.Area dataKey="http" label="HTTP" />
 *   <AreaChart.Area dataKey="tcp" label="TCP" />
 *   <AreaChart.Tooltip />
 *   <AreaChart.Legend />
 * </AreaChart.Root>
 * ```
 */
const Area = (props: AreaChartAreaProps) => useSeriesPrimitive("AreaChart.Area", "area", props);

/**
 * Horizontal hairline gridlines behind the areas (renderless; painted on
 * canvas). Omit the part to omit the grid.
 *
 * @see https://mantle.ngrok.com/components/charts/area-chart#areachartgrid
 *
 * @example
 * ```tsx
 * <AreaChart.Root data={data} xKey="date" stacked aria-label="Traffic by protocol">
 *   <AreaChart.Grid />
 *   <AreaChart.XAxis />
 *   <AreaChart.YAxis />
 *   <AreaChart.Area dataKey="http" label="HTTP" />
 *   <AreaChart.Area dataKey="tcp" label="TCP" />
 *   <AreaChart.Tooltip />
 *   <AreaChart.Legend />
 * </AreaChart.Root>
 * ```
 */
const Grid = (props: AreaChartGridProps) => useGridPrimitive("AreaChart.Grid", props);

/**
 * Tick labels along the bottom of the plot (renderless; painted on canvas).
 * Labels that would collide are skipped, never rotated.
 *
 * @see https://mantle.ngrok.com/components/charts/area-chart#areachartxaxis
 *
 * @example
 * ```tsx
 * <AreaChart.Root data={data} xKey="date" stacked aria-label="Traffic by protocol">
 *   <AreaChart.Grid />
 *   <AreaChart.XAxis tickFormat={(date) => new Date(date).toLocaleDateString()} />
 *   <AreaChart.YAxis />
 *   <AreaChart.Area dataKey="http" label="HTTP" />
 *   <AreaChart.Area dataKey="tcp" label="TCP" />
 *   <AreaChart.Tooltip />
 *   <AreaChart.Legend />
 * </AreaChart.Root>
 * ```
 */
const XAxis = (props: AreaChartXAxisProps) => useXAxisPrimitive("AreaChart.XAxis", props);

/**
 * Value tick labels along the left of the plot (renderless; painted on
 * canvas). Ticks land on clean thousands-separated numbers.
 *
 * @see https://mantle.ngrok.com/components/charts/area-chart#areachartyaxis
 *
 * @example
 * ```tsx
 * <AreaChart.Root data={data} xKey="date" stacked aria-label="Traffic by protocol">
 *   <AreaChart.Grid />
 *   <AreaChart.XAxis />
 *   <AreaChart.YAxis tickFormat={(value) => `${value / 1000}k`} />
 *   <AreaChart.Area dataKey="http" label="HTTP" />
 *   <AreaChart.Area dataKey="tcp" label="TCP" />
 *   <AreaChart.Tooltip />
 *   <AreaChart.Legend />
 * </AreaChart.Root>
 * ```
 */
const YAxis = (props: AreaChartYAxisProps) => useYAxisPrimitive("AreaChart.YAxis", props);

/**
 * A dashed horizontal marker at a y value — an SLO threshold, a budget, a
 * limit (renderless; painted on canvas).
 *
 * @see https://mantle.ngrok.com/components/charts/area-chart#areachartreferenceline
 *
 * @example
 * ```tsx
 * <AreaChart.Root data={data} xKey="date" stacked aria-label="Traffic by protocol">
 *   <AreaChart.Grid />
 *   <AreaChart.XAxis />
 *   <AreaChart.YAxis />
 *   <AreaChart.Area dataKey="http" label="HTTP" />
 *   <AreaChart.Area dataKey="tcp" label="TCP" />
 *   <AreaChart.ReferenceLine y={6000} label="Capacity" />
 *   <AreaChart.Tooltip />
 *   <AreaChart.Legend />
 * </AreaChart.Root>
 * ```
 */
const ReferenceLine = (props: AreaChartReferenceLineProps) =>
	useReferenceLinePrimitive("AreaChart.ReferenceLine", props);

/**
 * Customizes the hover/keyboard tooltip readout. The tooltip itself is part
 * of `AreaChart.Root`'s interaction contract and renders whether or not this
 * part is composed — compose it to format the label or values, append a
 * footer, or replace the content entirely via the render-prop `children`.
 *
 * @see https://mantle.ngrok.com/components/charts/area-chart#areacharttooltip
 *
 * @example
 * ```tsx
 * <AreaChart.Root data={data} xKey="date" stacked aria-label="Traffic by protocol">
 *   <AreaChart.Grid />
 *   <AreaChart.XAxis />
 *   <AreaChart.YAxis />
 *   <AreaChart.Area dataKey="http" label="HTTP" />
 *   <AreaChart.Area dataKey="tcp" label="TCP" />
 *   <AreaChart.Tooltip valueFormat={(value) => `${value} requests`} footer="Click to view logs" />
 *   <AreaChart.Legend />
 * </AreaChart.Root>
 * ```
 */
const Tooltip = (props: AreaChartTooltipProps) => useTooltipPrimitive("AreaChart.Tooltip", props);

/**
 * The legend: series names keyed by color swatches, rendered as real DOM in
 * flow below the plot. Always compose it on multi-series charts — identity
 * must never rely on color-matching alone. It renders nothing for a single
 * series (the chart's title already names it).
 *
 * @see https://mantle.ngrok.com/components/charts/area-chart#areachartlegend
 *
 * @example
 * ```tsx
 * <AreaChart.Root data={data} xKey="date" stacked aria-label="Traffic by protocol">
 *   <AreaChart.Grid />
 *   <AreaChart.XAxis />
 *   <AreaChart.YAxis />
 *   <AreaChart.Area dataKey="http" label="HTTP" />
 *   <AreaChart.Area dataKey="tcp" label="TCP" />
 *   <AreaChart.Tooltip />
 *   <AreaChart.Legend />
 * </AreaChart.Root>
 * ```
 */
const Legend = (props: AreaChartLegendProps) => (
	<ChartLegendPrimitive partName="AreaChart.Legend" slotName="area-chart" {...props} />
);

/**
 * A button that copies the chart's current data to the clipboard as a
 * markdown table (ISO dates, plain numbers, one column per series) —
 * pasteable into Slack, issues, docs, spreadsheets, and LLM chats. Renders
 * in flow where composed (alongside `Legend`, below the plot); `Root` is
 * relatively positioned, so `className` can dock it over a corner instead
 * (e.g. `absolute right-0 top-0`).
 *
 * @see https://mantle.ngrok.com/components/charts/area-chart#areachartcopybutton
 *
 * @example
 * ```tsx
 * <AreaChart.Root data={data} xKey="date" stacked aria-label="Traffic by protocol">
 *   <AreaChart.Area dataKey="http" label="HTTP" />
 *   <AreaChart.Area dataKey="tcp" label="TCP" />
 *   <AreaChart.Legend />
 *   <AreaChart.CopyButton />
 * </AreaChart.Root>
 * ```
 */
const CopyButton = (props: AreaChartCopyButtonProps) => (
	<ChartCopyButtonPrimitive partName="AreaChart.CopyButton" slotName="area-chart" {...props} />
);

/**
 * A canvas-rendered area chart for showing how values — and, when stacked, a
 * total and its parts — change over a continuous x axis. Each area fills with
 * a 10% wash of the series color plus a 2px band-edge stroke; the Root-level
 * `stacked` prop stacks the composed series in composition order from the
 * baseline. Series colors come from the theme's validated `--color-chart-*`
 * tokens; areas keep a fixed slot color for the chart's lifetime even as
 * other series are filtered in and out. Interaction — a crosshair with an
 * every-series tooltip, keyboard stepping, aria-live announcements, and an
 * sr-only data table — ships with `Root` unconditionally; large datasets
 * decimate before painting on canvas.
 *
 * @see https://mantle.ngrok.com/components/charts/area-chart
 *
 * @example
 * Composition:
 * ```
 * AreaChart.Root
 * ├── AreaChart.Grid
 * ├── AreaChart.XAxis
 * ├── AreaChart.YAxis
 * ├── AreaChart.Area (one per series)
 * ├── AreaChart.ReferenceLine
 * ├── AreaChart.Tooltip
 * └── AreaChart.Legend
 * ```
 *
 * @example
 * ```tsx
 * const data = [
 *   { date: new Date("2026-07-15"), http: 4200, tcp: 1400 },
 *   { date: new Date("2026-07-16"), http: 5100, tcp: 1650 },
 *   { date: new Date("2026-07-17"), http: 4700, tcp: 1500 },
 * ];
 *
 * <AreaChart.Root data={data} xKey="date" stacked aria-label="Traffic by protocol">
 *   <AreaChart.Grid />
 *   <AreaChart.XAxis />
 *   <AreaChart.YAxis />
 *   <AreaChart.Area dataKey="http" label="HTTP" />
 *   <AreaChart.Area dataKey="tcp" label="TCP" />
 *   <AreaChart.Tooltip />
 *   <AreaChart.Legend />
 * </AreaChart.Root>
 * ```
 */
const AreaChart = {
	/**
	 * The root of an area chart: owns the data, the scales, the canvas renderer,
	 * and the entire interaction contract.
	 *
	 * @see https://mantle.ngrok.com/components/charts/area-chart#areachartroot
	 *
	 * @example
	 * ```tsx
	 * <AreaChart.Root data={data} xKey="date" stacked aria-label="Traffic by protocol">
	 *   <AreaChart.Grid />
	 *   <AreaChart.XAxis />
	 *   <AreaChart.YAxis />
	 *   <AreaChart.Area dataKey="http" label="HTTP" />
	 *   <AreaChart.Area dataKey="tcp" label="TCP" />
	 *   <AreaChart.Tooltip />
	 *   <AreaChart.Legend />
	 * </AreaChart.Root>
	 * ```
	 */
	Root,
	/**
	 * One area series; registers with the chart and paints on canvas.
	 *
	 * @see https://mantle.ngrok.com/components/charts/area-chart#areachartarea
	 *
	 * @example
	 * ```tsx
	 * <AreaChart.Root data={data} xKey="date" stacked aria-label="Traffic by protocol">
	 *   <AreaChart.Grid />
	 *   <AreaChart.XAxis />
	 *   <AreaChart.YAxis />
	 *   <AreaChart.Area dataKey="http" label="HTTP" />
	 *   <AreaChart.Area dataKey="tcp" label="TCP" />
	 *   <AreaChart.Tooltip />
	 *   <AreaChart.Legend />
	 * </AreaChart.Root>
	 * ```
	 */
	Area,
	/**
	 * Hairline gridlines behind the areas.
	 *
	 * @see https://mantle.ngrok.com/components/charts/area-chart#areachartgrid
	 *
	 * @example
	 * ```tsx
	 * <AreaChart.Root data={data} xKey="date" stacked aria-label="Traffic by protocol">
	 *   <AreaChart.Grid />
	 *   <AreaChart.XAxis />
	 *   <AreaChart.YAxis />
	 *   <AreaChart.Area dataKey="http" label="HTTP" />
	 *   <AreaChart.Area dataKey="tcp" label="TCP" />
	 *   <AreaChart.Tooltip />
	 *   <AreaChart.Legend />
	 * </AreaChart.Root>
	 * ```
	 */
	Grid,
	/**
	 * Tick labels along the bottom of the plot.
	 *
	 * @see https://mantle.ngrok.com/components/charts/area-chart#areachartxaxis
	 *
	 * @example
	 * ```tsx
	 * <AreaChart.Root data={data} xKey="date" stacked aria-label="Traffic by protocol">
	 *   <AreaChart.Grid />
	 *   <AreaChart.XAxis tickFormat={(date) => new Date(date).toLocaleDateString()} />
	 *   <AreaChart.YAxis />
	 *   <AreaChart.Area dataKey="http" label="HTTP" />
	 *   <AreaChart.Area dataKey="tcp" label="TCP" />
	 *   <AreaChart.Tooltip />
	 *   <AreaChart.Legend />
	 * </AreaChart.Root>
	 * ```
	 */
	XAxis,
	/**
	 * Value tick labels along the left of the plot.
	 *
	 * @see https://mantle.ngrok.com/components/charts/area-chart#areachartyaxis
	 *
	 * @example
	 * ```tsx
	 * <AreaChart.Root data={data} xKey="date" stacked aria-label="Traffic by protocol">
	 *   <AreaChart.Grid />
	 *   <AreaChart.XAxis />
	 *   <AreaChart.YAxis tickFormat={(value) => `${value / 1000}k`} />
	 *   <AreaChart.Area dataKey="http" label="HTTP" />
	 *   <AreaChart.Area dataKey="tcp" label="TCP" />
	 *   <AreaChart.Tooltip />
	 *   <AreaChart.Legend />
	 * </AreaChart.Root>
	 * ```
	 */
	YAxis,
	/**
	 * A dashed horizontal marker at a y value (threshold, budget, limit).
	 *
	 * @see https://mantle.ngrok.com/components/charts/area-chart#areachartreferenceline
	 *
	 * @example
	 * ```tsx
	 * <AreaChart.Root data={data} xKey="date" stacked aria-label="Traffic by protocol">
	 *   <AreaChart.Grid />
	 *   <AreaChart.XAxis />
	 *   <AreaChart.YAxis />
	 *   <AreaChart.Area dataKey="http" label="HTTP" />
	 *   <AreaChart.Area dataKey="tcp" label="TCP" />
	 *   <AreaChart.ReferenceLine y={6000} label="Capacity" />
	 *   <AreaChart.Tooltip />
	 *   <AreaChart.Legend />
	 * </AreaChart.Root>
	 * ```
	 */
	ReferenceLine,
	/**
	 * Customizes the always-on hover/keyboard tooltip readout.
	 *
	 * @see https://mantle.ngrok.com/components/charts/area-chart#areacharttooltip
	 *
	 * @example
	 * ```tsx
	 * <AreaChart.Root data={data} xKey="date" stacked aria-label="Traffic by protocol">
	 *   <AreaChart.Grid />
	 *   <AreaChart.XAxis />
	 *   <AreaChart.YAxis />
	 *   <AreaChart.Area dataKey="http" label="HTTP" />
	 *   <AreaChart.Area dataKey="tcp" label="TCP" />
	 *   <AreaChart.Tooltip valueFormat={(value) => `${value} requests`} />
	 *   <AreaChart.Legend />
	 * </AreaChart.Root>
	 * ```
	 */
	Tooltip,
	/**
	 * The legend; always compose it on multi-series charts. Renders nothing for
	 * a single series.
	 *
	 * @see https://mantle.ngrok.com/components/charts/area-chart#areachartlegend
	 *
	 * @example
	 * ```tsx
	 * <AreaChart.Root data={data} xKey="date" stacked aria-label="Traffic by protocol">
	 *   <AreaChart.Grid />
	 *   <AreaChart.XAxis />
	 *   <AreaChart.YAxis />
	 *   <AreaChart.Area dataKey="http" label="HTTP" />
	 *   <AreaChart.Area dataKey="tcp" label="TCP" />
	 *   <AreaChart.Tooltip />
	 *   <AreaChart.Legend />
	 * </AreaChart.Root>
	 * ```
	 */
	Legend,
	/**
	 * Copies the chart's current data to the clipboard as a markdown table.
	 *
	 * @see https://mantle.ngrok.com/components/charts/area-chart#areachartcopybutton
	 *
	 * @example
	 * ```tsx
	 * <AreaChart.Root data={data} xKey="date" stacked aria-label="Traffic by protocol">
	 *   <AreaChart.Area dataKey="http" label="HTTP" />
	 *   <AreaChart.Area dataKey="tcp" label="TCP" />
	 *   <AreaChart.Legend />
	 *   <AreaChart.CopyButton />
	 * </AreaChart.Root>
	 * ```
	 */
	CopyButton,
} as const;

export type {
	//,
	AreaChartAreaProps,
	AreaChartCopyButtonProps,
	AreaChartGridProps,
	AreaChartLegendProps,
	AreaChartReferenceLineProps,
	AreaChartRootProps,
	AreaChartTooltipProps,
	AreaChartXAxisProps,
	AreaChartYAxisProps,
	ChartDatumEvent,
};
export {
	//,
	AreaChart,
};
