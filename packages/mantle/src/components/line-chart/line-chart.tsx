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
	ContinuousXScale,
	CurveKind,
	PointShape,
	SeriesColor,
} from "../chart/types.js";
import { createSvgBackend } from "../chart/svg-backend.js";

/**
 * Props for {@link LineChart.List}.
 */
type LineChartListProps = ChartListPrimitiveProps;

/**
 * Props for {@link LineChart.Root}. Lines encode value by vertical position,
 * not length from a baseline, so the full y domain stays overridable via
 * `yDomain` — and lines never stack, so there is no `stacked` prop.
 */
type LineChartRootProps<
	TDatum extends ChartDatum = ChartDatum,
	TMode extends ChartMode = "interactive",
> = Omit<ChartRootBaseProps, "stacked"> &
	ChartAccessibilityProps<TMode> & {
		/** Rows of data; each `LineChart.Line` reads one numeric key per row. */
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
	};

/**
 * Props for {@link LineChart.Line}.
 */
type LineChartLineProps = {
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
	 * <LineChart.Line dataKey="p99" label="p99" color="blue" />
	 * ```
	 */
	color: SeriesColor;
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
	 * The glyph the hover dot, the painted point markers, and the legend key
	 * wear: `"circle"`, `"square"`, `"triangle"`, `"diamond"`,
	 * `"triangle-down"`, `"plus"`, `"cross"`, or `"star"`. Shape is a redundant
	 * encoding alongside color that keeps series distinguishable without color
	 * vision. Defaults to `"circle"`.
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
 * The root of a line chart: owns the data, the scales, the renderer,
 * and the entire interaction contract (a crosshair snapped to the nearest x
 * with a tooltip reading every series, keyboard stepping with polite
 * announcements, an sr-only description, an sr-only data table, Enter/Space +
 * click activation). Rendering decimates to min/max per pixel column, so series
 * of 100k+ points stay smooth. Compose the chrome and series parts as
 * children.
 *
 * A Root mounts dormant: a shell of the plot, the named overlay, and its
 * sr-only description. It builds its paint surface and its engine
 * once it comes within one viewport of the visible area, takes focus, or
 * prints (on-screen charts first, a few milliseconds at a time), and it mounts
 * the sr-only data table once focus lands inside it. A list of charts pays
 * for the ones a reader can see, and a page of sparklines holds no hidden
 * tables until a reader asks for one.
 *
 * The Root's own subtree is addressable by slot: `line-chart` on the wrapper,
 * then `line-chart-plot`, `line-chart-svg`,
 * `line-chart-crosshair`,
 * `line-chart-hover-band`, `line-chart-markers`, `line-chart-tooltip`,
 * `line-chart-description`, and, once focus lands inside the chart,
 * `line-chart-data-table`. A line chart shows the crosshair and one marker
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
 * | `data-slot` | `"line-chart-description"` | The `sr-only` description the overlay's `aria-describedby` points at: the chart kind, the point count, the x range, the series labels, and, on an interactive chart, the keyboard instructions. Omitted when `mode="decorative"`. |
 * | `data-slot` | `"line-chart-data-table"` | The `sr-only` data table. Mounts once focus lands inside the chart (`data-state` flips to `"engaged"`) and stays. Interactive charts only. |
 * | `data-state` | `"dormant"` \| `"engaged"` | On the Root. Flips to `"engaged"` once focus lands inside the chart, and never flips back. The data table mounts with it. Visibility paints the chart but never flips it. Interactive charts only. |
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
 *   <LineChart.Line dataKey="p50" label="p50" color="blue" />
 *   <LineChart.Line dataKey="p99" label="p99" curve="monotone" color="emerald" />
 *   <LineChart.Tooltip />
 *   <LineChart.Legend />
 * </LineChart.Root>
 * ```
 */
const Root = <TDatum extends ChartDatum = ChartDatum, TMode extends ChartMode = "interactive">(
	props: LineChartRootProps<TDatum, TMode>,
) => (
	<ChartRootPrimitive
		kind="line"
		componentName="LineChart"
		slotName="line-chart"
		paintBackend={createSvgBackend}
		{...props}
	/>
);

/**
 * One line series. Renders nothing itself — it registers the series with the
 * chart, which paints it. Compose one `Line` per series; `null` and
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
 *   <LineChart.Line dataKey="p50" label="p50" color="blue" />
 *   <LineChart.Line dataKey="p99" label="p99" curve="monotone" color="emerald" />
 *   <LineChart.Legend />
 * </LineChart.Root>
 * ```
 */
const Line = (props: LineChartLineProps) => useSeriesPrimitive("LineChart.Line", "line", props);

/**
 * Horizontal hairline gridlines behind the lines (renderless; the chart
 * paints it). Omit the part to omit the grid.
 *
 * @see https://mantle.ngrok.com/components/charts/line-chart#linechartgrid
 *
 * @example
 * ```tsx
 * <LineChart.Root data={data} xKey="time" aria-label="Request latency">
 *   <LineChart.Grid />
 *   <LineChart.XAxis />
 *   <LineChart.YAxis />
 *   <LineChart.Line dataKey="p50" label="p50" color="blue" />
 *   <LineChart.Legend />
 * </LineChart.Root>
 * ```
 */
const Grid = (props: LineChartGridProps) => useGridPrimitive("LineChart.Grid", props);

/**
 * Tick labels along the bottom of the plot (renderless; the chart paints it).
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
 *   <LineChart.Line dataKey="p50" label="p50" color="blue" />
 *   <LineChart.Legend />
 * </LineChart.Root>
 * ```
 */
const XAxis = (props: LineChartXAxisProps) => useXAxisPrimitive("LineChart.XAxis", props);

/**
 * Value tick labels along the left of the plot (renderless; the chart
 * paints it). Ticks land on clean thousands-separated numbers.
 *
 * @see https://mantle.ngrok.com/components/charts/line-chart#linechartyaxis
 *
 * @example
 * ```tsx
 * <LineChart.Root data={data} xKey="time" aria-label="Request latency">
 *   <LineChart.Grid />
 *   <LineChart.XAxis />
 *   <LineChart.YAxis tickFormat={(value) => `${value}ms`} />
 *   <LineChart.Line dataKey="p50" label="p50" color="blue" />
 *   <LineChart.Legend />
 * </LineChart.Root>
 * ```
 */
const YAxis = (props: LineChartYAxisProps) => useYAxisPrimitive("LineChart.YAxis", props);

/**
 * A dashed horizontal marker at a y value — an SLO threshold, a budget, a
 * limit (renderless; the chart paints it).
 *
 * @see https://mantle.ngrok.com/components/charts/line-chart#linechartreferenceline
 *
 * @example
 * ```tsx
 * <LineChart.Root data={data} xKey="time" aria-label="Request latency">
 *   <LineChart.Grid />
 *   <LineChart.XAxis />
 *   <LineChart.YAxis />
 *   <LineChart.Line dataKey="p50" label="p50" color="blue" />
 *   <LineChart.ReferenceLine y={500} label="SLO" />
 *   <LineChart.Legend />
 * </LineChart.Root>
 * ```
 */
const ReferenceLine = (props: LineChartReferenceLineProps) =>
	useReferenceLinePrimitive("LineChart.ReferenceLine", props);

/**
 * Customizes the hover/keyboard tooltip readout. The tooltip itself is part
 * of `LineChart.Root`'s interaction contract and renders even when this part
 * is absent — compose it to format the label or values, append a footer, or
 * replace the content entirely via the render-prop `children`.
 *
 * **Structure.** A `children` readout renders inside a
 * `<div data-slot="line-chart-tooltip-label">`. When it goes away, React removes
 * that div instead of your own text nodes: a browser translation engine
 * reparents a text node, and a removal aimed at one throws. The div is
 * `display: contents`, so it lays out nothing of its own. To style it as a box,
 * set a display of your own on it first.
 *
 * **Data attributes:**
 *
 * | Data Attribute | Value | Description |
 * | --- | --- | --- |
 * | `data-slot` | `"line-chart-tooltip-label"` | On the `<div>` wrapping a `children` readout. The default readout has none. |
 *
 * @see https://mantle.ngrok.com/components/charts/line-chart#linecharttooltip
 *
 * @example
 * ```tsx
 * <LineChart.Root data={data} xKey="time" aria-label="Request latency">
 *   <LineChart.Grid />
 *   <LineChart.XAxis />
 *   <LineChart.YAxis />
 *   <LineChart.Line dataKey="p50" label="p50" color="blue" />
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
 * **Structure.** A `children` render prop renders inside a
 * `<div data-slot="line-chart-legend-label">`. When it goes away, React removes
 * that div instead of your own text nodes: a browser translation engine
 * reparents a text node, and a removal aimed at one throws. The div is
 * `display: contents`, so it lays out nothing of its own. To style it as a box,
 * set a display of your own on it first.
 *
 * **Data attributes:**
 *
 * | Data Attribute | Value | Description |
 * | --- | --- | --- |
 * | `data-slot` | `"line-chart-legend"` | The legend list. `LineChart.Legend` renders it in flow below the plot. |
 * | `data-slot` | `"line-chart-legend-label"` | On the `<div>` wrapping a `children` render prop. The default legend has none. |
 * | `data-shape` | `"circle"` \| `"square"` \| `"triangle"` \| `"diamond"` \| `"triangle-down"` \| `"plus"` \| `"cross"` \| `"star"` | On the glyph riding each swatch's stroke, naming what its `LineChart.Line` wears — the `shape` it set, else the circle. The glyph clips itself to that shape, so target this only to restyle a key. |
 *
 * @see https://mantle.ngrok.com/components/charts/line-chart#linechartlegend
 *
 * @example
 * ```tsx
 * <LineChart.Root data={data} xKey="time" aria-label="Request latency">
 *   <LineChart.Grid />
 *   <LineChart.XAxis />
 *   <LineChart.YAxis />
 *   <LineChart.Line dataKey="p50" label="p50" color="blue" />
 *   <LineChart.Line dataKey="p99" label="p99" curve="monotone" color="emerald" />
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
 *   <LineChart.Line dataKey="p50" label="p50" color="blue" />
 *   <LineChart.Line dataKey="p99" label="p99" color="emerald" />
 *   <LineChart.Legend />
 *   <LineChart.CopyButton />
 * </LineChart.Root>
 * ```
 */
const CopyButton = (props: LineChartCopyButtonProps) => (
	<ChartCopyButtonPrimitive partName="LineChart.CopyButton" slotName="line-chart" {...props} />
);

/**
 * Groups a list of charts, such as one chart per card, so they share one
 * `role="status"` live region. A page of 100 charts mounts one region instead
 * of one per chart, plus one for each `LineChart.CopyButton`. Each chart keeps
 * its own tooltip, description, and data table.
 *
 * Renders a `div` (`line-chart-list`) that holds the charts in a `display: contents`
 * wrapper (`line-chart-list-items`), so a grid or flex layout on the List reaches
 * the cards, and the live region as its last child. No `asChild`: a list
 * element such as `ul` cannot hold the live region as a child.
 *
 * @see https://mantle.ngrok.com/components/charts/line-chart#linechartlist
 *
 * @example
 * ```tsx
 * <LineChart.List>
 *   {agents.map((agent) => (
 *     <LineChart.Root key={agent.id} data={agent.rows} xKey="time" aria-label={agent.name}>
 *       <LineChart.Line dataKey="p50" label="p50" color="blue" />
 *       <LineChart.Tooltip />
 *     </LineChart.Root>
 *   ))}
 * </LineChart.List>
 * ```
 */
const List = (props: LineChartListProps) => (
	<ChartListPrimitive slotName="line-chart-list" {...props} />
);

/**
 * A line chart for trends over a continuous x — time above
 * all. Each series names its own `color`. Interaction ships with `Root`
 * unconditionally: a crosshair snapped to the nearest x with an every-series
 * tooltip, keyboard stepping, aria-live announcements, and an sr-only
 * description. A Root paints and allocates its surface once it comes within
 * one viewport of the visible area or takes focus, and it mounts its sr-only
 * data table once focus lands inside it. Min/max decimation keeps 100k+ point
 * series smooth.
 *
 * **CSS variables (public API):**
 *
 * | CSS Variable | Default | Description |
 * | --- | --- | --- |
 * | `--color-chart-<name>` | per theme | The color a series with `color="<name>"` paints. Every mantle color name has one: the 600 step of its hue in light mode, and the 500 step in dark mode. Most names reach 3:1 contrast on the card surface, and the docs page lists the names that do not. |
 *
 * Two ways to change a series color, both public API. The `color` prop on
 * `LineChart.Line` takes a color name or any CSS color. To restyle a color name for one chart,
 * redeclare its token on `Root`:
 * `className="[--color-chart-blue:var(--color-brand)]"`. Every token resolves in
 * `Root`'s own cascade, so a declaration scoped there wins for
 * that chart and leaves every other chart on the page alone.
 *
 * @useWhen Show how one or more values trend across an ordered x axis, such as time, including
 * long series with many points.
 *
 * @siblings
 * - `AreaChart`: the chart shows a volume, or a total and its parts, as filled areas.
 * - `BarChart`: the reader compares values across categories by bar length from zero.
 * - `ScatterPlot`: the points show how two measures correlate, and their order does not matter.
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
 * A List groups Roots:
 * ```
 * LineChart.List
 * └── LineChart.Root (one per chart)
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
 *   <LineChart.Line dataKey="p50" label="p50" color="blue" />
 *   <LineChart.Line dataKey="p99" label="p99" curve="monotone" color="emerald" />
 *   <LineChart.Tooltip />
 *   <LineChart.Legend />
 * </LineChart.Root>
 * ```
 */
const LineChart = {
	/**
	 * The root of a line chart: owns the data, the scales, the renderer,
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
	 *   <LineChart.Line dataKey="p50" label="p50" color="blue" />
	 *   <LineChart.Line dataKey="p99" label="p99" curve="monotone" color="emerald" />
	 *   <LineChart.Tooltip />
	 *   <LineChart.Legend />
	 * </LineChart.Root>
	 * ```
	 */
	Root,
	/**
	 * One line series; registers with the chart, which paints it.
	 *
	 * @see https://mantle.ngrok.com/components/charts/line-chart#linechartline
	 *
	 * @example
	 * ```tsx
	 * <LineChart.Root data={data} xKey="time" aria-label="Request latency">
	 *   <LineChart.Grid />
	 *   <LineChart.XAxis />
	 *   <LineChart.YAxis />
	 *   <LineChart.Line dataKey="p50" label="p50" color="blue" />
	 *   <LineChart.Line dataKey="p99" label="p99" curve="monotone" color="emerald" />
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
	 *   <LineChart.Line dataKey="p50" label="p50" color="blue" />
	 *   <LineChart.Line dataKey="p99" label="p99" curve="monotone" color="emerald" />
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
	 *   <LineChart.Line dataKey="p50" label="p50" color="blue" />
	 *   <LineChart.Line dataKey="p99" label="p99" curve="monotone" color="emerald" />
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
	 *   <LineChart.Line dataKey="p50" label="p50" color="blue" />
	 *   <LineChart.Line dataKey="p99" label="p99" curve="monotone" color="emerald" />
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
	 *   <LineChart.Line dataKey="p50" label="p50" color="blue" />
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
	 *   <LineChart.Line dataKey="p50" label="p50" color="blue" />
	 *   <LineChart.Line dataKey="p99" label="p99" curve="monotone" color="emerald" />
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
	 *   <LineChart.Line dataKey="p50" label="p50" color="blue" />
	 *   <LineChart.Line dataKey="p99" label="p99" curve="monotone" color="emerald" />
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
	 *   <LineChart.Line dataKey="p50" label="p50" color="blue" />
	 *   <LineChart.Line dataKey="p99" label="p99" color="emerald" />
	 *   <LineChart.Legend />
	 *   <LineChart.CopyButton />
	 * </LineChart.Root>
	 * ```
	 */
	CopyButton,
	/**
	 * Groups a list of charts so they share one live region.
	 *
	 * @see https://mantle.ngrok.com/components/charts/line-chart#linechartlist
	 *
	 * @example
	 * ```tsx
	 * <LineChart.List>
	 *   {agents.map((agent) => (
	 *     <LineChart.Root key={agent.id} data={agent.rows} xKey="time" aria-label={agent.name}>
	 *       <LineChart.Line dataKey="p50" label="p50" color="blue" />
	 *       <LineChart.Tooltip />
	 *     </LineChart.Root>
	 *   ))}
	 * </LineChart.List>
	 * ```
	 */
	List,
} as const;

export type {
	//,
	ChartDatumEvent,
	ChartMode,
	LineChartCopyButtonProps,
	LineChartGridProps,
	LineChartLegendProps,
	LineChartListProps,
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
