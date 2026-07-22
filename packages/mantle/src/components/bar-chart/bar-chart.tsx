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
import type {
	BarOrientation,
	BarTexture,
	ChartDatum,
	ChartDatumEvent,
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
 * Props for {@link BarChart.Root}. Bars encode value by length from a shared
 * zero baseline, so the y domain minimum is fixed at `0` — a truncated-bar
 * axis is unrepresentable.
 */
type BarChartRootProps<TDatum extends ChartDatum = ChartDatum> = Omit<
	ChartRootBaseProps,
	"yDomain"
> &
	ChartAccessibleName & {
		/** Rows of data; each `BarChart.Bar` reads one numeric key per row. */
		data: readonly TDatum[];
		/** The key of each row's category (x) value. */
		xKey: Extract<keyof TDatum, string>;
		/** Override the automatic y maximum. The minimum is always the zero baseline. */
		yDomain?: [0, number | "auto"];
		/**
		 * The direction the bars point — this names the bars, not an axis.
		 * `"vertical"` (default) bars stand up from a bottom baseline with
		 * categories along the x axis; `"horizontal"` bars run rightward from a
		 * left baseline with categories down the y axis — better for long category
		 * labels or many categories. The value axis, baseline, reference lines, and
		 * `"perpendicular"` texture all flip to match.
		 */
		orientation?: BarOrientation;
	};

/**
 * Props for {@link BarChart.Bar}.
 */
type BarChartBarProps = {
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
	 * The fill texture the series wears, on canvas and on its legend key:
	 * `"solid"` (default), diagonal hatch lines at 45° (`"hatch"`), the 135°
	 * mirror (`"hatch-reverse"`), both (`"crosshatch"`), rungs perpendicular
	 * to the bar's length (`"perpendicular"`), or an offset dot grid
	 * (`"dots"`). Texture is a redundant identity encoding alongside color —
	 * tone-on-tone ink from the series' own fill — so grouped and stacked
	 * series stay distinguishable without color vision, in grayscale print,
	 * and under forced colors. Keep it opt-in and purposeful, never
	 * decorative: on a multi-series chart, leave the first series solid and
	 * texture the rest.
	 */
	texture?: BarTexture;
};

/**
 * Props for {@link BarChart.Grid}.
 */
type BarChartGridProps = GridPrimitiveProps;

/**
 * Props for {@link BarChart.XAxis}. The tick formatter receives the row's
 * category value.
 */
type BarChartXAxisProps = XAxisPrimitiveProps;

/**
 * Props for {@link BarChart.YAxis}.
 */
type BarChartYAxisProps = YAxisPrimitiveProps;

/**
 * Props for {@link BarChart.ReferenceLine}.
 */
type BarChartReferenceLineProps = ReferenceLinePrimitiveProps;

/**
 * Props for {@link BarChart.Tooltip}.
 */
type BarChartTooltipProps = TooltipPrimitiveProps;

/**
 * Props for {@link BarChart.Legend}.
 */
type BarChartLegendProps = LegendPrimitiveProps;

/**
 * Props for {@link BarChart.CopyButton}.
 */
type BarChartCopyButtonProps = CopyButtonPrimitiveProps;

/**
 * The root of a bar chart: owns the data, the scales, the canvas renderer,
 * and the entire interaction contract (per-category hover with a lifted band
 * and tooltip, keyboard stepping with polite announcements, an sr-only data
 * table, Enter/Space + click activation). Compose the chrome and series parts
 * as children.
 *
 * @see https://mantle.ngrok.com/components/charts/bar-chart#barchartroot
 *
 * @example
 * ```tsx
 * const data = [
 *   { month: "January", desktop: 186, mobile: 80 },
 *   { month: "February", desktop: 305, mobile: 200 },
 *   { month: "March", desktop: 237, mobile: 120 },
 * ];
 *
 * <BarChart.Root data={data} xKey="month" aria-label="Visitors by month">
 *   <BarChart.Grid />
 *   <BarChart.XAxis />
 *   <BarChart.YAxis />
 *   <BarChart.Bar dataKey="desktop" label="Desktop" />
 *   <BarChart.Bar dataKey="mobile" label="Mobile" />
 *   <BarChart.Legend />
 * </BarChart.Root>
 * ```
 */
const Root = <TDatum extends ChartDatum = ChartDatum>(props: BarChartRootProps<TDatum>) => (
	<ChartRootPrimitive kind="bar" componentName="BarChart" slotName="bar-chart" {...props} />
);

/**
 * One bar series. Renders nothing itself — it registers the series with the
 * chart, which paints it on canvas. Compose one `Bar` per series; with
 * `stacked` on the Root, bars stack in composition order from the baseline up.
 * `texture` adds a diagonal-hatch fill as a redundant identity encoding
 * alongside color, worn by the bars and the series' legend key alike.
 *
 * @see https://mantle.ngrok.com/components/charts/bar-chart#barchartbar
 *
 * @example
 * ```tsx
 * <BarChart.Root data={data} xKey="month" aria-label="Visitors by month">
 *   <BarChart.Grid />
 *   <BarChart.XAxis />
 *   <BarChart.YAxis />
 *   <BarChart.Bar dataKey="desktop" label="Desktop" />
 *   <BarChart.Bar dataKey="mobile" label="Mobile" />
 *   <BarChart.Legend />
 * </BarChart.Root>
 * ```
 */
const Bar = (props: BarChartBarProps) => useSeriesPrimitive("BarChart.Bar", "bar", props);

/**
 * Hairline value gridlines behind the bars (renderless; painted on canvas).
 * The default runs perpendicular to the bars — horizontal lines for vertical
 * bars, vertical lines for horizontal bars; pass `lines` to force a direction.
 * Omit the part to omit the grid.
 *
 * @see https://mantle.ngrok.com/components/charts/bar-chart#barchartgrid
 *
 * @example
 * ```tsx
 * <BarChart.Root data={data} xKey="month" aria-label="Visitors by month">
 *   <BarChart.Grid />
 *   <BarChart.XAxis />
 *   <BarChart.YAxis />
 *   <BarChart.Bar dataKey="desktop" label="Desktop" />
 *   <BarChart.Legend />
 * </BarChart.Root>
 * ```
 */
const Grid = (props: BarChartGridProps) => useGridPrimitive("BarChart.Grid", props);

/**
 * Category labels for the bars (renderless; painted on canvas): along the
 * bottom for vertical bars, down the left gutter for horizontal bars. Labels
 * that would collide are skipped, never rotated.
 *
 * @see https://mantle.ngrok.com/components/charts/bar-chart#barchartxaxis
 *
 * @example
 * ```tsx
 * <BarChart.Root data={data} xKey="month" aria-label="Visitors by month">
 *   <BarChart.Grid />
 *   <BarChart.XAxis tickFormat={(month) => String(month).slice(0, 3)} />
 *   <BarChart.YAxis />
 *   <BarChart.Bar dataKey="desktop" label="Desktop" />
 *   <BarChart.Legend />
 * </BarChart.Root>
 * ```
 */
const XAxis = (props: BarChartXAxisProps) => useXAxisPrimitive("BarChart.XAxis", props);

/**
 * Value tick labels (renderless; painted on canvas): along the left for
 * vertical bars, across the bottom for horizontal bars. Ticks land on clean
 * thousands-separated numbers.
 *
 * @see https://mantle.ngrok.com/components/charts/bar-chart#barchartyaxis
 *
 * @example
 * ```tsx
 * <BarChart.Root data={data} xKey="month" aria-label="Visitors by month">
 *   <BarChart.Grid />
 *   <BarChart.XAxis />
 *   <BarChart.YAxis tickFormat={(value) => `${value / 1000}k`} />
 *   <BarChart.Bar dataKey="desktop" label="Desktop" />
 *   <BarChart.Legend />
 * </BarChart.Root>
 * ```
 */
const YAxis = (props: BarChartYAxisProps) => useYAxisPrimitive("BarChart.YAxis", props);

/**
 * A dashed marker at the value `y` — an SLO threshold, a budget, a limit
 * (renderless; painted on canvas). It crosses the value axis: a horizontal
 * line for vertical bars, a vertical line for horizontal bars.
 *
 * @see https://mantle.ngrok.com/components/charts/bar-chart#barchartreferenceline
 *
 * @example
 * ```tsx
 * <BarChart.Root data={data} xKey="month" aria-label="Visitors by month">
 *   <BarChart.Grid />
 *   <BarChart.XAxis />
 *   <BarChart.YAxis />
 *   <BarChart.Bar dataKey="desktop" label="Desktop" />
 *   <BarChart.ReferenceLine y={250} label="Capacity" />
 *   <BarChart.Legend />
 * </BarChart.Root>
 * ```
 */
const ReferenceLine = (props: BarChartReferenceLineProps) =>
	useReferenceLinePrimitive("BarChart.ReferenceLine", props);

/**
 * Customizes the hover/keyboard tooltip readout. The tooltip itself is part
 * of `BarChart.Root`'s interaction contract and renders whether or not this
 * part is composed — compose it to format the label or values, append a
 * footer, or replace the content entirely via the render-prop `children`.
 *
 * @see https://mantle.ngrok.com/components/charts/bar-chart#barcharttooltip
 *
 * @example
 * ```tsx
 * <BarChart.Root data={data} xKey="month" aria-label="Visitors by month">
 *   <BarChart.Grid />
 *   <BarChart.XAxis />
 *   <BarChart.YAxis />
 *   <BarChart.Bar dataKey="desktop" label="Desktop" />
 *   <BarChart.Tooltip valueFormat={(value) => `${value} visits`} footer="Click to view logs" />
 *   <BarChart.Legend />
 * </BarChart.Root>
 * ```
 */
const Tooltip = (props: BarChartTooltipProps) => useTooltipPrimitive("BarChart.Tooltip", props);

/**
 * The legend: series names keyed by color swatches, rendered as real DOM in
 * flow below the plot. Always compose it on multi-series charts — identity
 * must never rely on color-matching alone. It renders nothing for a single
 * series (the chart's title already names it).
 *
 * @see https://mantle.ngrok.com/components/charts/bar-chart#barchartlegend
 *
 * @example
 * ```tsx
 * <BarChart.Root data={data} xKey="month" aria-label="Visitors by month">
 *   <BarChart.Grid />
 *   <BarChart.XAxis />
 *   <BarChart.YAxis />
 *   <BarChart.Bar dataKey="desktop" label="Desktop" />
 *   <BarChart.Bar dataKey="mobile" label="Mobile" />
 *   <BarChart.Legend />
 * </BarChart.Root>
 * ```
 */
const Legend = (props: BarChartLegendProps) => (
	<ChartLegendPrimitive partName="BarChart.Legend" slotName="bar-chart" {...props} />
);

/**
 * A button that copies the chart's current data to the clipboard as a
 * markdown table (ISO dates, plain numbers, one column per series) —
 * pasteable into Slack, issues, docs, spreadsheets, and LLM chats. Renders
 * in flow where composed (alongside `Legend`, below the plot); `Root` is
 * relatively positioned, so `className` can dock it over a corner instead
 * (e.g. `absolute right-0 top-0`).
 *
 * @see https://mantle.ngrok.com/components/charts/bar-chart#barchartcopybutton
 *
 * @example
 * ```tsx
 * <BarChart.Root data={data} xKey="month" aria-label="Visitors by month">
 *   <BarChart.Bar dataKey="desktop" label="Desktop" />
 *   <BarChart.Bar dataKey="mobile" label="Mobile" />
 *   <BarChart.Legend />
 *   <BarChart.CopyButton />
 * </BarChart.Root>
 * ```
 */
const CopyButton = (props: BarChartCopyButtonProps) => (
	<ChartCopyButtonPrimitive partName="BarChart.CopyButton" slotName="bar-chart" {...props} />
);

/**
 * A canvas-rendered bar chart for comparing values across categories, with
 * grouped and stacked variants. Series colors come from the theme's validated
 * `--color-chart-*` tokens; bars keep a fixed slot color for the chart's
 * lifetime even as other series are filtered in and out. Interaction —
 * per-category tooltip, keyboard stepping, aria-live announcements, and an
 * sr-only data table — ships with `Root` unconditionally.
 *
 * @see https://mantle.ngrok.com/components/charts/bar-chart
 *
 * @example
 * Composition:
 * ```
 * BarChart.Root
 * ├── BarChart.Grid
 * ├── BarChart.XAxis
 * ├── BarChart.YAxis
 * ├── BarChart.Bar (one per series)
 * ├── BarChart.ReferenceLine
 * ├── BarChart.Tooltip
 * └── BarChart.Legend
 * ```
 *
 * @example
 * ```tsx
 * const data = [
 *   { month: "January", desktop: 186, mobile: 80 },
 *   { month: "February", desktop: 305, mobile: 200 },
 *   { month: "March", desktop: 237, mobile: 120 },
 * ];
 *
 * <BarChart.Root data={data} xKey="month" aria-label="Visitors by month">
 *   <BarChart.Grid />
 *   <BarChart.XAxis />
 *   <BarChart.YAxis />
 *   <BarChart.Bar dataKey="desktop" label="Desktop" />
 *   <BarChart.Bar dataKey="mobile" label="Mobile" />
 *   <BarChart.Tooltip />
 *   <BarChart.Legend />
 * </BarChart.Root>
 * ```
 */
const BarChart = {
	/**
	 * The root of a bar chart: owns the data, the scales, the canvas renderer,
	 * and the entire interaction contract.
	 *
	 * @see https://mantle.ngrok.com/components/charts/bar-chart#barchartroot
	 *
	 * @example
	 * ```tsx
	 * <BarChart.Root data={data} xKey="month" aria-label="Visitors by month">
	 *   <BarChart.Grid />
	 *   <BarChart.XAxis />
	 *   <BarChart.YAxis />
	 *   <BarChart.Bar dataKey="desktop" label="Desktop" />
	 *   <BarChart.Bar dataKey="mobile" label="Mobile" />
	 *   <BarChart.Tooltip />
	 *   <BarChart.Legend />
	 * </BarChart.Root>
	 * ```
	 */
	Root,
	/**
	 * One bar series; registers with the chart and paints on canvas.
	 *
	 * @see https://mantle.ngrok.com/components/charts/bar-chart#barchartbar
	 *
	 * @example
	 * ```tsx
	 * <BarChart.Root data={data} xKey="month" aria-label="Visitors by month">
	 *   <BarChart.Grid />
	 *   <BarChart.XAxis />
	 *   <BarChart.YAxis />
	 *   <BarChart.Bar dataKey="desktop" label="Desktop" />
	 *   <BarChart.Bar dataKey="mobile" label="Mobile" />
	 *   <BarChart.Tooltip />
	 *   <BarChart.Legend />
	 * </BarChart.Root>
	 * ```
	 */
	Bar,
	/**
	 * Hairline gridlines behind the bars.
	 *
	 * @see https://mantle.ngrok.com/components/charts/bar-chart#barchartgrid
	 *
	 * @example
	 * ```tsx
	 * <BarChart.Root data={data} xKey="month" aria-label="Visitors by month">
	 *   <BarChart.Grid />
	 *   <BarChart.XAxis />
	 *   <BarChart.YAxis />
	 *   <BarChart.Bar dataKey="desktop" label="Desktop" />
	 *   <BarChart.Bar dataKey="mobile" label="Mobile" />
	 *   <BarChart.Tooltip />
	 *   <BarChart.Legend />
	 * </BarChart.Root>
	 * ```
	 */
	Grid,
	/**
	 * Category labels along the bottom of the plot.
	 *
	 * @see https://mantle.ngrok.com/components/charts/bar-chart#barchartxaxis
	 *
	 * @example
	 * ```tsx
	 * <BarChart.Root data={data} xKey="month" aria-label="Visitors by month">
	 *   <BarChart.Grid />
	 *   <BarChart.XAxis tickFormat={(month) => String(month).slice(0, 3)} />
	 *   <BarChart.YAxis />
	 *   <BarChart.Bar dataKey="desktop" label="Desktop" />
	 *   <BarChart.Bar dataKey="mobile" label="Mobile" />
	 *   <BarChart.Tooltip />
	 *   <BarChart.Legend />
	 * </BarChart.Root>
	 * ```
	 */
	XAxis,
	/**
	 * Value tick labels along the left of the plot.
	 *
	 * @see https://mantle.ngrok.com/components/charts/bar-chart#barchartyaxis
	 *
	 * @example
	 * ```tsx
	 * <BarChart.Root data={data} xKey="month" aria-label="Visitors by month">
	 *   <BarChart.Grid />
	 *   <BarChart.XAxis />
	 *   <BarChart.YAxis tickFormat={(value) => `${value / 1000}k`} />
	 *   <BarChart.Bar dataKey="desktop" label="Desktop" />
	 *   <BarChart.Bar dataKey="mobile" label="Mobile" />
	 *   <BarChart.Tooltip />
	 *   <BarChart.Legend />
	 * </BarChart.Root>
	 * ```
	 */
	YAxis,
	/**
	 * A dashed horizontal marker at a y value (threshold, budget, limit).
	 *
	 * @see https://mantle.ngrok.com/components/charts/bar-chart#barchartreferenceline
	 *
	 * @example
	 * ```tsx
	 * <BarChart.Root data={data} xKey="month" aria-label="Visitors by month">
	 *   <BarChart.Grid />
	 *   <BarChart.XAxis />
	 *   <BarChart.YAxis />
	 *   <BarChart.Bar dataKey="desktop" label="Desktop" />
	 *   <BarChart.ReferenceLine y={250} label="Capacity" />
	 *   <BarChart.Tooltip />
	 *   <BarChart.Legend />
	 * </BarChart.Root>
	 * ```
	 */
	ReferenceLine,
	/**
	 * Customizes the always-on hover/keyboard tooltip readout.
	 *
	 * @see https://mantle.ngrok.com/components/charts/bar-chart#barcharttooltip
	 *
	 * @example
	 * ```tsx
	 * <BarChart.Root data={data} xKey="month" aria-label="Visitors by month">
	 *   <BarChart.Grid />
	 *   <BarChart.XAxis />
	 *   <BarChart.YAxis />
	 *   <BarChart.Bar dataKey="desktop" label="Desktop" />
	 *   <BarChart.Bar dataKey="mobile" label="Mobile" />
	 *   <BarChart.Tooltip valueFormat={(value) => `${value} visits`} />
	 *   <BarChart.Legend />
	 * </BarChart.Root>
	 * ```
	 */
	Tooltip,
	/**
	 * The legend; always compose it on multi-series charts. Renders nothing for
	 * a single series.
	 *
	 * @see https://mantle.ngrok.com/components/charts/bar-chart#barchartlegend
	 *
	 * @example
	 * ```tsx
	 * <BarChart.Root data={data} xKey="month" aria-label="Visitors by month">
	 *   <BarChart.Grid />
	 *   <BarChart.XAxis />
	 *   <BarChart.YAxis />
	 *   <BarChart.Bar dataKey="desktop" label="Desktop" />
	 *   <BarChart.Bar dataKey="mobile" label="Mobile" />
	 *   <BarChart.Tooltip />
	 *   <BarChart.Legend />
	 * </BarChart.Root>
	 * ```
	 */
	Legend,
	/**
	 * Copies the chart's current data to the clipboard as a markdown table.
	 *
	 * @see https://mantle.ngrok.com/components/charts/bar-chart#barchartcopybutton
	 *
	 * @example
	 * ```tsx
	 * <BarChart.Root data={data} xKey="month" aria-label="Visitors by month">
	 *   <BarChart.Bar dataKey="desktop" label="Desktop" />
	 *   <BarChart.Bar dataKey="mobile" label="Mobile" />
	 *   <BarChart.Legend />
	 *   <BarChart.CopyButton />
	 * </BarChart.Root>
	 * ```
	 */
	CopyButton,
} as const;

export type {
	//,
	BarChartBarProps,
	BarChartCopyButtonProps,
	BarChartGridProps,
	BarChartLegendProps,
	BarChartReferenceLineProps,
	BarChartRootProps,
	BarChartTooltipProps,
	BarChartXAxisProps,
	BarChartYAxisProps,
	ChartDatumEvent,
};
export {
	//,
	BarChart,
};
