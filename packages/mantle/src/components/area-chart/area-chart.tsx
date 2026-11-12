"use client";

import type { ChartAccessibilityProps, ChartMode } from "../chart/context.js";
import { ChartCopyButtonPrimitive } from "../chart/copy-button.js";
import type { CopyButtonPrimitiveProps } from "../chart/copy-button.js";
import { ChartLegendPrimitive } from "../chart/legend.js";
import type { LegendPrimitiveProps } from "../chart/legend.js";
import { ChartListPrimitive } from "../chart/list.js";
import type { ChartListPrimitiveProps } from "../chart/list.js";
import {
	useGridPrimitive,
	useReferenceLinePrimitive,
	useSeriesPrimitive,
	useXAxisPrimitive,
	useYAxisPrimitive,
} from "../chart/registration.js";
import type {
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
	ChartDatum,
	ChartDatumEvent,
	ChartSeriesSlot,
	ContinuousXScale,
	CurveKind,
	PointShape,
	SeriesColor,
} from "../chart/types.js";
import { createSvgBackend } from "../chart/svg-backend.js";

/**
 * Props for {@link AreaChart.List}.
 */
type AreaChartListProps = ChartListPrimitiveProps;

/**
 * Props for {@link AreaChart.Root}. Areas fill from a shared zero baseline, so
 * the y domain minimum is fixed at `0` — a truncated-area axis is
 * unrepresentable.
 */
type AreaChartRootProps<
	TDatum extends ChartDatum = ChartDatum,
	TMode extends ChartMode = "interactive",
> = Omit<ChartRootBaseProps, "yDomain"> &
	ChartAccessibilityProps<TMode> & {
		/** Rows of data; each `AreaChart.Area` reads one numeric key per row. */
		data: readonly TDatum[];
		/**
		 * The key of each row's x value. If no row has the key, the Root throws.
		 */
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
	/**
	 * The row key this series reads its numeric values from.
	 * If no row has the key, the chart throws, so put the key in every row, with
	 * `null` for no value. A row with no value renders a gap, unless `connectNulls`
	 * joins across it.
	 */
	dataKey: string;
	/** Display name for the legend, tooltip, and data table. Defaults to `dataKey`. */
	label?: string;
	/**
	 * A fixed visual identity slot. Slots `1` through `8` select a paired chart
	 * color and point shape. `"other"` selects the shared neutral treatment.
	 *
	 * Series receive unreserved slots in composition order. Set `seriesSlot` to
	 * give a series a fixed visual identity.
	 *
	 * @example
	 * ```tsx
	 * <AreaChart.Area dataKey="errors" seriesSlot={4} />
	 * ```
	 */
	seriesSlot?: ChartSeriesSlot;
	/**
	 * Override the color channel with a chart token or any CSS color. This does
	 * not change the series slot or its paired point shape. When omitted, the
	 * series paints the color from its slot.
	 *
	 * A static color (raw hex) cannot follow the two themes, so prefer a
	 * `var(--your-token)` declared per theme. A series that carries good/bad
	 * meaning should wear the semantic status colors, never a categorical slot.
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
	 * The glyph the hover dot and the legend key wear: `"circle"`, `"square"`,
	 * `"triangle"`, `"diamond"`, `"triangle-down"`, `"plus"`, `"cross"`, or
	 * `"star"`. Shape is a redundant encoding alongside color that keeps series
	 * distinguishable without color vision. When omitted, the series wears the
	 * glyph paired to its series slot, so both channels name one slot.
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
 * The root of an area chart: owns the data, the scales, the renderer,
 * and the entire interaction contract (a crosshair with an every-series
 * tooltip, keyboard stepping with polite announcements, an sr-only
 * description, an sr-only data table, Enter/Space + click activation). Areas
 * fill with a 10% wash of the series color plus a 2px band-edge stroke;
 * `stacked` on the Root stacks the series in registration order, the
 * first-registered series at the baseline. Large datasets decimate before
 * painting. Compose the chrome and series parts as children.
 *
 * A Root mounts dormant: a shell of the plot, the named overlay, and its
 * sr-only description. It builds its paint surface and its engine
 * once it comes within one viewport of the visible area, takes focus, or
 * prints (on-screen charts first, a few milliseconds at a time), and it mounts
 * the sr-only data table once focus lands inside it. A list of charts pays
 * for the ones a reader can see, and a page of sparklines holds no hidden
 * tables until a reader asks for one.
 *
 * The Root's own subtree is addressable by slot: `area-chart` on the wrapper,
 * then `area-chart-plot`, `area-chart-svg`,
 * `area-chart-crosshair`,
 * `area-chart-hover-band`, `area-chart-markers`, `area-chart-tooltip`,
 * `area-chart-description`, and, once focus lands inside the chart,
 * `area-chart-data-table`. An area chart shows the crosshair and one marker
 * dot per series, and never the band. The surface and the three layers are
 * engine-owned: absent from server HTML and from a dormant chart. The surface arrives at activation (near the viewport, on
 * focus, or before print), and the layers arrive on the first hover or
 * keyboard step. A static or
 * decorative chart inserts the surface alone. The tooltip
 * surface mounts on the first hover or keyboard step and stays.
 * Each hover dot carries `chart-active-point` plus a `data-shape` of
 * `"circle"`, `"square"`, `"triangle"`, `"diamond"`, `"triangle-down"`,
 * `"plus"`, `"cross"`, or `"star"`, naming the glyph its series wears.
 *
 * **Data attributes:**
 *
 * | Data Attribute | Value | Description |
 * | --- | --- | --- |
 * | `data-slot` | `"area-chart-description"` | The `sr-only` description the overlay's `aria-describedby` points at: the chart kind, the point count, the x range, the series labels, and, on an interactive chart, the keyboard instructions. Omitted when `mode="decorative"`. |
 * | `data-slot` | `"area-chart-data-table"` | The `sr-only` data table. Mounts once focus lands inside the chart (`data-state` flips to `"engaged"`) and stays. Interactive charts only. |
 * | `data-state` | `"dormant"` \| `"engaged"` | On the Root. Flips to `"engaged"` once focus lands inside the chart, and never flips back. The data table mounts with it. Visibility paints the chart but never flips it. Interactive charts only. |
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
const Root = <TDatum extends ChartDatum = ChartDatum, TMode extends ChartMode = "interactive">(
	props: AreaChartRootProps<TDatum, TMode>,
) => (
	<ChartRootPrimitive
		kind="area"
		componentName="AreaChart"
		slotName="area-chart"
		paintBackend={createSvgBackend}
		{...props}
	/>
);

/**
 * One area series. Renders nothing itself — it registers the series with the
 * chart, which paints it. Compose one `Area` per series; with
 * `stacked` on the Root, areas stack in registration order with the
 * first-registered series at the baseline, so an `Area` that mounts later
 * stacks on top whatever its position in the JSX.
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
 * Horizontal hairline gridlines behind the areas (renderless; the chart
 * paints it). Omit the part to omit the grid.
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
 * Tick labels along the bottom of the plot (renderless; the chart paints it).
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
 * Value tick labels along the left of the plot (renderless; the chart
 * paints it). Ticks land on clean thousands-separated numbers.
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
 * limit (renderless; the chart paints it).
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
 * of `AreaChart.Root`'s interaction contract and renders even when this part
 * is absent — compose it to format the label or values, append a footer, or
 * replace the content entirely via the render-prop `children`.
 *
 * **Structure.** A `children` readout renders inside a
 * `<div data-slot="area-chart-tooltip-label">`. When it goes away, React removes
 * that div instead of your own text nodes: a browser translation engine
 * reparents a text node, and a removal aimed at one throws. The div is
 * `display: contents`, so it lays out nothing of its own. To style it as a box,
 * set a display of your own on it first.
 *
 * **Data attributes:**
 *
 * | Data Attribute | Value | Description |
 * | --- | --- | --- |
 * | `data-slot` | `"area-chart-tooltip-label"` | On the `<div>` wrapping a `children` readout. The default readout has none. |
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
 * **Structure.** A `children` render prop renders inside a
 * `<div data-slot="area-chart-legend-label">`. When it goes away, React removes
 * that div instead of your own text nodes: a browser translation engine
 * reparents a text node, and a removal aimed at one throws. The div is
 * `display: contents`, so it lays out nothing of its own. To style it as a box,
 * set a display of your own on it first.
 *
 * **Data attributes:**
 *
 * | Data Attribute | Value | Description |
 * | --- | --- | --- |
 * | `data-slot` | `"area-chart-legend"` | The legend list. `AreaChart.Legend` renders it in flow below the plot. |
 * | `data-slot` | `"area-chart-legend-label"` | On the `<div>` wrapping a `children` render prop. The default legend has none. |
 * | `data-shape` | `"circle"` \| `"square"` \| `"triangle"` \| `"diamond"` \| `"triangle-down"` \| `"plus"` \| `"cross"` \| `"star"` | On each series' swatch, naming the glyph its `AreaChart.Area` wears — the `shape` it set, else the one paired to its series slot. The swatch clips itself to that glyph, so target this only to restyle a key. |
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
 * Groups a list of charts, such as one chart per card, so they share one
 * `role="status"` live region. A page of 100 charts mounts one region instead
 * of one per chart. Each chart keeps its own tooltip, description, and data
 * table.
 *
 * Renders a `div` (`area-chart-list`) that holds the charts in a `display: contents`
 * wrapper (`area-chart-list-items`), so a grid or flex layout on the List reaches
 * the cards, and the live region as its last child. No `asChild`: a list
 * element such as `ul` cannot hold the live region as a child.
 *
 * @see https://mantle.ngrok.com/components/charts/area-chart#areachartlist
 *
 * @example
 * ```tsx
 * <AreaChart.List>
 *   {agents.map((agent) => (
 *     <AreaChart.Root key={agent.id} data={agent.rows} xKey="date" aria-label={agent.name}>
 *       <AreaChart.Area dataKey="http" label="HTTP" />
 *       <AreaChart.Tooltip />
 *     </AreaChart.Root>
 *   ))}
 * </AreaChart.List>
 * ```
 */
const List = (props: AreaChartListProps) => (
	<ChartListPrimitive slotName="area-chart-list" {...props} />
);

/**
 * An area chart for showing how values — and, when stacked, a
 * total and its parts — change over a continuous x axis. Each area fills with
 * a 10% wash of the series color plus a 2px band-edge stroke; the Root-level
 * `stacked` prop stacks the series in registration order from the baseline.
 * Series colors come from the theme's validated `--color-chart-*`
 * tokens; areas keep a fixed slot color for the chart's lifetime even as
 * other series are filtered in and out. Interaction ships with `Root`
 * unconditionally: a crosshair with an every-series tooltip, keyboard
 * stepping, aria-live announcements, and an sr-only description. A Root builds
 * and paints its surface once it comes within one viewport of the visible
 * area, takes focus, or prints, and it mounts its sr-only data table once
 * focus lands inside it. Large datasets decimate before painting.
 *
 * **CSS variables (public API):**
 *
 * | CSS Variable | Default | Description |
 * | --- | --- | --- |
 * | `--color-chart-1` … `--color-chart-8` | per theme | The validated categorical series slots, in assignment order. |
 * | `--color-chart-other` | `--color-neutral-500` | The neutral overflow slot a series wears once every slot is held. |
 *
 * Two ways to change a series color, both public API. The `color` prop on
 * `AreaChart.Area` sets one series and takes any CSS color. To restyle a slot itself,
 * redeclare its token on `Root` —
 * `className="[--color-chart-1:var(--color-brand)]"`. Every token resolves in
 * `Root`'s own cascade, so a declaration scoped there wins for
 * that chart and leaves every other chart on the page alone.
 *
 * @useWhen Show how a volume, or a total and its parts, changes across an ordered x axis, such as
 * time.
 *
 * @siblings
 * - `LineChart`: the series are trends to compare, and filled areas would hide where they cross.
 * - `BarChart`: the reader compares values across categories by bar length from zero.
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
 * ├── AreaChart.Legend
 * └── AreaChart.CopyButton
 * ```
 *
 * A List groups Roots:
 * ```
 * AreaChart.List
 * └── AreaChart.Root (one per chart)
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
	 * The root of an area chart: owns the data, the scales, the renderer,
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
	 * One area series; registers with the chart, which paints it.
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
	/**
	 * Groups a list of charts so they share one live region.
	 *
	 * @see https://mantle.ngrok.com/components/charts/area-chart#areachartlist
	 *
	 * @example
	 * ```tsx
	 * <AreaChart.List>
	 *   {agents.map((agent) => (
	 *     <AreaChart.Root key={agent.id} data={agent.rows} xKey="date" aria-label={agent.name}>
	 *       <AreaChart.Area dataKey="http" label="HTTP" />
	 *       <AreaChart.Tooltip />
	 *     </AreaChart.Root>
	 *   ))}
	 * </AreaChart.List>
	 * ```
	 */
	List,
} as const;

export type {
	//,
	AreaChartAreaProps,
	AreaChartCopyButtonProps,
	AreaChartGridProps,
	AreaChartLegendProps,
	AreaChartListProps,
	AreaChartReferenceLineProps,
	AreaChartRootProps,
	AreaChartTooltipProps,
	AreaChartXAxisProps,
	AreaChartYAxisProps,
	ChartDatumEvent,
	ChartMode,
};
export {
	//,
	AreaChart,
};
