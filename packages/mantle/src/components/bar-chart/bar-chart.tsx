"use client";

import type { ChartAccessibilityProps, ChartMode } from "../chart/context.js";
import { ChartCopyButtonPrimitive } from "../chart/copy-button.js";
import type { CopyButtonPrimitiveProps } from "../chart/copy-button.js";
import { ChartLegendPrimitive } from "../chart/legend.js";
import type { LegendPrimitiveProps } from "../chart/legend.js";
import { ChartListPrimitive } from "../chart/list.js";
import type { ChartListPrimitiveProps } from "../chart/list.js";
import {
	useEmptySlotPrimitive,
	useGridPrimitive,
	useReferenceLinePrimitive,
	useSeriesPrimitive,
	useXAxisPrimitive,
	useYAxisPrimitive,
} from "../chart/registration.js";
import type {
	EmptySlotPrimitiveProps,
	GridPrimitiveProps,
	ReferenceLinePrimitiveProps,
	XAxisPrimitiveProps,
	YAxisPrimitiveProps,
} from "../chart/registration.js";
import { ChartRootPrimitive } from "../chart/root.js";
import type { ChartRootBaseProps } from "../chart/root.js";
import { useTooltipPrimitive } from "../chart/tooltip.js";
import type { TooltipPrimitiveProps } from "../chart/tooltip.js";
import type {
	BarOrientation,
	BarTexture,
	ChartDatum,
	ChartDatumEvent,
	SeriesColor,
	YAxisSide,
} from "../chart/types.js";
import { createSvgBackend } from "../chart/svg-backend.js";

/**
 * Props for {@link BarChart.List}.
 */
type BarChartListProps = ChartListPrimitiveProps;

/**
 * Props for {@link BarChart.Root}.
 */
type BarChartRootProps<
	TDatum extends ChartDatum = ChartDatum,
	TMode extends ChartMode = "interactive",
> = ChartRootBaseProps &
	ChartAccessibilityProps<TMode> & {
		/** Rows of data; each `BarChart.Bar` reads one numeric key per row. */
		data: readonly TDatum[];
		/**
		 * The key of each row's category (x) value. If no row has the key, the Root throws.
		 */
		xKey: Extract<keyof TDatum, string>;
		/**
		 * The direction the bars point. This names the bars, not an axis.
		 * `"vertical"` (default) bars stand up from a bottom baseline with
		 * categories along the x axis; `"horizontal"` bars run rightward from a
		 * left baseline with categories down the y axis, better for long category
		 * labels or many categories. The value axis, baseline, reference lines, and
		 * the two rung textures (`"perpendicular"` and `"parallel"`) all flip to
		 * match.
		 */
		orientation?: BarOrientation;
	};

/**
 * Props for {@link BarChart.Bar}.
 */
type BarChartBarProps = {
	/**
	 * The row key this series reads its numeric values from.
	 * If no row has the key, the chart throws, so put the key in every row, with
	 * `null` for no value. A row where no series has a value renders a gap, or
	 * an outlined slot when the chart composes `BarChart.EmptySlot`.
	 */
	dataKey: string;
	/** Display name for the legend, tooltip, and data table. Defaults to `dataKey`. */
	label?: string;
	/**
	 * The color the series paints: a mantle color name, the same `Color` that
	 * `Badge` takes, or any CSS color. Required: name every series' color on
	 * purpose. Give an "Other" series `"neutral"`, and a series that means good
	 * or bad a functional color such as `"danger"`.
	 *
	 * A static CSS color (raw hex) cannot follow the two themes, so prefer a
	 * `var(--your-token)` declared per theme.
	 *
	 * @example
	 * ```tsx
	 * <BarChart.Bar dataKey="errors" label="Errors" color="danger" />
	 * ```
	 */
	color: SeriesColor;
	/**
	 * The fill texture the series wears, on the bars and on its legend key:
	 * `"solid"` (default), diagonal hatch lines at 45° (`"hatch"`), the 135°
	 * mirror (`"hatch-reverse"`), both (`"crosshatch"`), rungs perpendicular
	 * to the bar's length (`"perpendicular"`: horizontal lines on vertical
	 * bars), rungs parallel to it (`"parallel"`: vertical lines on vertical
	 * bars), the orthogonal lattice of both rung directions (`"grid"`), or an
	 * offset dot field (`"dots"`).
	 *
	 * The two rung textures flip with the Root's `orientation`, in opposite
	 * senses. Every other value is direction-free, `"grid"` included: it is the
	 * orthogonal lattice against `"crosshatch"`'s diagonal one.
	 *
	 * A textured series paints its marks in the full series color over a light
	 * tint of it, so it reads as the light member of its color's pair. Texture
	 * is a redundant identity encoding alongside color: grouped and stacked
	 * series stay distinguishable without color vision, in grayscale print, and
	 * under forced colors. Keep it purposeful: two series of one color told
	 * apart by texture, such as In and Out traffic, or the series in a pair that
	 * color alone cannot separate.
	 */
	texture?: BarTexture;
	/**
	 * The y axis whose scale places this series: `"left"` (the default) or
	 * `"right"`. A `"right"` series needs a {@link BarChart.YAxis} with `side="right"`.
	 */
	yAxis?: YAxisSide;
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
 * Props for {@link BarChart.YAxis}. Bars encode value by length from a shared
 * zero baseline, so the `domain` minimum is fixed at `0`. A truncated-bar axis
 * is unrepresentable.
 */
type BarChartYAxisProps = YAxisPrimitiveProps<[0, number | "auto"]>;

/**
 * Props for {@link BarChart.ReferenceLine}.
 */
type BarChartReferenceLineProps = ReferenceLinePrimitiveProps;

/**
 * Props for {@link BarChart.EmptySlot}.
 */
type BarChartEmptySlotProps = EmptySlotPrimitiveProps;

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
 * The root of a bar chart: owns the data, the scales, the renderer,
 * and the entire interaction contract (per-category hover with a lifted band
 * and tooltip, keyboard stepping with polite announcements, an sr-only
 * description, an sr-only data table, Enter/Space + click activation).
 * Compose the chrome and series parts as children.
 *
 * A Root mounts dormant: a shell of the plot, the named overlay, and its
 * sr-only description. It builds its paint surface and its engine
 * once it comes within one viewport of the visible area, takes focus, or
 * prints (on-screen charts first, a few milliseconds at a time), and it mounts
 * the sr-only data table once focus lands inside it. A list of charts pays
 * for the ones a reader can see, and a page of sparklines holds no hidden
 * tables until a reader asks for one.
 *
 * The Root's own subtree is addressable by slot: `bar-chart` on the wrapper,
 * then `bar-chart-plot`, `bar-chart-svg`,
 * `bar-chart-crosshair`,
 * `bar-chart-hover-band`, `bar-chart-markers`, `bar-chart-tooltip`,
 * `bar-chart-description`, and, once focus lands inside the chart,
 * `bar-chart-data-table`. A bar chart shows the band and never the crosshair.
 * The markers hold one hover dot for each composed `LineChart.Line` or
 * `AreaChart.Area`, and stay empty on a chart of bars alone. The surface and the three layers are engine-owned: absent
 * from server HTML and from a dormant chart. The surface arrives at activation (near the viewport, on
 * focus, or before print), and the layers arrive on the first hover or
 * keyboard step. A static or decorative chart
 * inserts the surface alone. The tooltip surface mounts on the
 * first hover or keyboard step and stays.
 *
 * **Data attributes:**
 *
 * | Data Attribute | Value | Description |
 * | --- | --- | --- |
 * | `data-slot` | `"bar-chart-description"` | The `sr-only` description the overlay's `aria-describedby` points at: the chart kind, the category count, the first and last category, the series labels, and, on an interactive chart, the keyboard instructions. Omitted when `mode="decorative"`. |
 * | `data-slot` | `"bar-chart-data-table"` | The `sr-only` data table. Mounts once focus lands inside the chart (`data-engaged` appears) and stays. Interactive charts only. |
 * | `data-engaged` | present once engaged | On the Root. Appears once focus lands inside the chart, and never goes away. The data table mounts with it. Visibility paints the chart but never flips it. Interactive charts only. |
 * | `data-y-scale` | `"log"` or absent | On the Root. Present while a `YAxis` on either side has `scale="log"`. Absent on a linear chart. |
 * | `data-value` | a number | On each cell of the `sr-only` data table that shows a finite number, and on a numeric x row header. The raw number. A missing value has none. |
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
 *   <BarChart.Bar dataKey="desktop" label="Desktop" color="blue" />
 *   <BarChart.Bar dataKey="mobile" label="Mobile" color="emerald" />
 *   <BarChart.Legend />
 * </BarChart.Root>
 * ```
 */
const Root = <TDatum extends ChartDatum = ChartDatum, TMode extends ChartMode = "interactive">(
	props: BarChartRootProps<TDatum, TMode>,
) => (
	<ChartRootPrimitive
		kind="bar"
		componentName="BarChart"
		slotName="bar-chart"
		paintBackend={createSvgBackend}
		{...props}
	/>
);

/**
 * One bar series. Renders nothing itself: it registers the series with the
 * chart, which paints it. Compose one `Bar` per series; with
 * `stacked` on the Root, bars stack from the baseline up in registration
 * order, so a `Bar` that mounts later stacks on top whatever its position in
 * the JSX. `texture` adds a pattern fill as a redundant identity encoding
 * alongside color, worn by the bars and the series' legend key alike.
 *
 * To draw a trend over the bars, such as a running total, compose a
 * `LineChart.Line` or an `AreaChart.Area` in the same Root. It runs through
 * each category's center on the shared y axis, takes no bar slot, and never
 * joins a stack. Vertical bars only.
 *
 * @see https://mantle.ngrok.com/components/charts/bar-chart#barchartbar
 *
 * @example
 * ```tsx
 * <BarChart.Root data={data} xKey="month" aria-label="Visitors by month">
 *   <BarChart.Grid />
 *   <BarChart.XAxis />
 *   <BarChart.YAxis />
 *   <BarChart.Bar dataKey="desktop" label="Desktop" color="blue" />
 *   <BarChart.Bar dataKey="mobile" label="Mobile" color="emerald" />
 *   <BarChart.Legend />
 * </BarChart.Root>
 * ```
 */
const Bar = (props: BarChartBarProps) => useSeriesPrimitive("BarChart.Bar", "bar", props);

/**
 * Hairline value gridlines behind the bars (renderless; the chart paints it).
 * The default runs perpendicular to the bars: horizontal lines for vertical
 * bars, vertical lines for horizontal bars. Pass `lines` to force a direction.
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
 *   <BarChart.Bar dataKey="desktop" label="Desktop" color="blue" />
 *   <BarChart.Legend />
 * </BarChart.Root>
 * ```
 */
const Grid = (props: BarChartGridProps) => useGridPrimitive("BarChart.Grid", props);

/**
 * Category labels for the bars (renderless; the chart paints it): along the
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
 *   <BarChart.Bar dataKey="desktop" label="Desktop" color="blue" />
 *   <BarChart.Legend />
 * </BarChart.Root>
 * ```
 */
const XAxis = (props: BarChartXAxisProps) => useXAxisPrimitive("BarChart.XAxis", props);

/**
 * Value tick labels (renderless; the chart paints it): along the left for
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
 *   <BarChart.Bar dataKey="desktop" label="Desktop" color="blue" />
 *   <BarChart.Legend />
 * </BarChart.Root>
 * ```
 */
const YAxis = (props: BarChartYAxisProps) => useYAxisPrimitive("BarChart.YAxis", props);

/**
 * A dashed marker at the value `y`, such as an SLO threshold, a budget, or a
 * limit (renderless; the chart paints it). It crosses the value axis: a horizontal
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
 *   <BarChart.Bar dataKey="desktop" label="Desktop" color="blue" />
 *   <BarChart.ReferenceLine y={250} label="Capacity" />
 *   <BarChart.Legend />
 * </BarChart.Root>
 * ```
 */
const ReferenceLine = (props: BarChartReferenceLineProps) =>
	useReferenceLinePrimitive("BarChart.ReferenceLine", props);

/**
 * Marks each row with no reading as an empty slot (renderless; the chart
 * paints it). A row where no `BarChart.Bar` has a value (`null` or a missing
 * key) paints a 1px outline as wide as the row's bars, 30% of the plot from
 * the baseline, toward the side with room on a chart of negative values. The
 * tooltip, the keyboard announcement, and the data table say `label` there
 * instead of a value for each series.
 *
 * A `0` is a reading, not an empty slot: a row of zeros paints no outline and
 * reads `0`. The outline marks a slot, not a value, so it never moves the
 * value axis. Omit the part and a row with no reading stays a gap.
 *
 * @see https://mantle.ngrok.com/components/charts/bar-chart#barchartemptyslot
 *
 * @example
 * ```tsx
 * const hours = [
 *   { hour: "13:00", bytesOut: 60, bytesIn: 40 },
 *   { hour: "14:00", bytesOut: null, bytesIn: null },
 *   { hour: "15:00", bytesOut: 0, bytesIn: 0 },
 * ];
 *
 * <BarChart.Root data={hours} xKey="hour" stacked aria-label="Traffic by hour">
 *   <BarChart.Bar dataKey="bytesOut" label="Bytes out" color="neutral" />
 *   <BarChart.Bar dataKey="bytesIn" label="Bytes in" color="neutral" texture="hatch" />
 *   <BarChart.EmptySlot label="No traffic reported" />
 * </BarChart.Root>
 * ```
 */
const EmptySlot = (props: BarChartEmptySlotProps) =>
	useEmptySlotPrimitive("BarChart.EmptySlot", props);

/**
 * Customizes the hover/keyboard tooltip readout. The tooltip itself is part
 * of `BarChart.Root`'s interaction contract and renders even when this part is
 * absent. Compose it to format the label or values, append a footer, or
 * replace the content entirely via the render-prop `children`.
 *
 * **Structure.** A `children` readout renders inside a
 * `<div data-slot="bar-chart-tooltip-label">`. When it goes away, React removes
 * that div instead of your own text nodes: a browser translation engine
 * reparents a text node, and a removal aimed at one throws. The div is
 * `display: contents`, so it lays out nothing of its own. To style it as a box,
 * set a display of your own on it first.
 *
 * **Data attributes:**
 *
 * | Data Attribute | Value | Description |
 * | --- | --- | --- |
 * | `data-slot` | `"bar-chart-tooltip-label"` | On the `<div>` wrapping a `children` readout. The default readout has none. |
 *
 * @see https://mantle.ngrok.com/components/charts/bar-chart#barcharttooltip
 *
 * @example
 * ```tsx
 * <BarChart.Root data={data} xKey="month" aria-label="Visitors by month">
 *   <BarChart.Grid />
 *   <BarChart.XAxis />
 *   <BarChart.YAxis />
 *   <BarChart.Bar dataKey="desktop" label="Desktop" color="blue" />
 *   <BarChart.Tooltip valueFormat={(value) => `${value} visits`} footer="Click to view logs" />
 *   <BarChart.Legend />
 * </BarChart.Root>
 * ```
 */
const Tooltip = (props: BarChartTooltipProps) => useTooltipPrimitive("BarChart.Tooltip", props);

/**
 * The legend: series names keyed by color swatches, rendered as real DOM in
 * flow below the plot. Always compose it on multi-series charts: identity
 * must never rely on color-matching alone. It renders nothing for a single
 * series (the chart's title already names it).
 *
 * **Structure.** A `children` render prop renders inside a
 * `<div data-slot="bar-chart-legend-label">`. When it goes away, React removes
 * that div instead of your own text nodes: a browser translation engine
 * reparents a text node, and a removal aimed at one throws. The div is
 * `display: contents`, so it lays out nothing of its own. To style it as a box,
 * set a display of your own on it first.
 *
 * **Data attributes:**
 *
 * | Data Attribute | Value | Description |
 * | --- | --- | --- |
 * | `data-slot` | `"bar-chart-legend"` | The legend list. `BarChart.Legend` renders it in flow below the plot. |
 * | `data-slot` | `"bar-chart-legend-label"` | On the `<div>` wrapping a `children` render prop. The default legend has none. |
 * | `data-texture` | `"solid"` \| `"hatch"` \| `"hatch-reverse"` \| `"crosshatch"` \| `"perpendicular"` \| `"parallel"` \| `"grid"` \| `"dots"` | On each series' swatch, naming the `texture` its `BarChart.Bar` registered. The swatch paints the pattern itself, so target this only to restyle a key. |
 *
 * @see https://mantle.ngrok.com/components/charts/bar-chart#barchartlegend
 *
 * @example
 * ```tsx
 * <BarChart.Root data={data} xKey="month" aria-label="Visitors by month">
 *   <BarChart.Grid />
 *   <BarChart.XAxis />
 *   <BarChart.YAxis />
 *   <BarChart.Bar dataKey="desktop" label="Desktop" color="blue" />
 *   <BarChart.Bar dataKey="mobile" label="Mobile" color="emerald" />
 *   <BarChart.Legend />
 * </BarChart.Root>
 * ```
 */
const Legend = (props: BarChartLegendProps) => (
	<ChartLegendPrimitive partName="BarChart.Legend" slotName="bar-chart" {...props} />
);

/**
 * A button that copies the chart's current data to the clipboard as a
 * markdown table (ISO dates, plain numbers, one column per series). The table
 * pastes into Slack, issues, docs, spreadsheets, and LLM chats. Renders
 * in flow where composed (alongside `Legend`, below the plot); `Root` is
 * relatively positioned, so `className` can dock it over a corner instead
 * (e.g. `absolute right-0 top-0`).
 *
 * @see https://mantle.ngrok.com/components/charts/bar-chart#barchartcopybutton
 *
 * @example
 * ```tsx
 * <BarChart.Root data={data} xKey="month" aria-label="Visitors by month">
 *   <BarChart.Bar dataKey="desktop" label="Desktop" color="blue" />
 *   <BarChart.Bar dataKey="mobile" label="Mobile" color="emerald" />
 *   <BarChart.Legend />
 *   <BarChart.CopyButton />
 * </BarChart.Root>
 * ```
 */
const CopyButton = (props: BarChartCopyButtonProps) => (
	<ChartCopyButtonPrimitive partName="BarChart.CopyButton" slotName="bar-chart" {...props} />
);

/**
 * Groups a list of charts, such as one chart per card, so they share one
 * `role="status"` live region. A page of 100 charts mounts one region instead
 * of one per chart. Copy buttons announce in one shared region. Each chart keeps
 * its own tooltip, description, and data table.
 *
 * Renders a `div` (`bar-chart-list`) that holds the charts in a `display: contents`
 * wrapper (`bar-chart-list-items`), so a grid or flex layout on the List reaches
 * the cards, and the live region as its last child. No `asChild`: a list
 * element such as `ul` cannot hold the live region as a child.
 *
 * @see https://mantle.ngrok.com/components/charts/bar-chart#barchartlist
 *
 * @example
 * ```tsx
 * <BarChart.List>
 *   {agents.map((agent) => (
 *     <BarChart.Root key={agent.id} data={agent.rows} xKey="month" aria-label={agent.name}>
 *       <BarChart.Bar dataKey="desktop" label="Desktop" color="blue" />
 *       <BarChart.Tooltip />
 *     </BarChart.Root>
 *   ))}
 * </BarChart.List>
 * ```
 */
const List = (props: BarChartListProps) => (
	<ChartListPrimitive slotName="bar-chart-list" {...props} />
);

export type {
	//,
	BarChartBarProps,
	BarChartCopyButtonProps,
	BarChartEmptySlotProps,
	BarChartGridProps,
	BarChartLegendProps,
	BarChartListProps,
	BarChartReferenceLineProps,
	BarChartRootProps,
	BarChartTooltipProps,
	BarChartXAxisProps,
	BarChartYAxisProps,
	ChartDatumEvent,
	ChartMode,
};
export {
	//,
	Root,
	Bar,
	Grid,
	XAxis,
	YAxis,
	ReferenceLine,
	EmptySlot,
	Tooltip,
	Legend,
	CopyButton,
	List,
};
