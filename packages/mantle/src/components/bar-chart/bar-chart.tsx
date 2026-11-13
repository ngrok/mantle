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
	BarOrientation,
	BarTexture,
	ChartDatum,
	ChartDatumEvent,
	SeriesColor,
} from "../chart/types.js";
import { createSvgBackend } from "../chart/svg-backend.js";

/**
 * Props for {@link BarChart.List}.
 */
type BarChartListProps = ChartListPrimitiveProps;

/**
 * Props for {@link BarChart.Root}. Bars encode value by length from a shared
 * zero baseline, so the y domain minimum is fixed at `0` — a truncated-bar
 * axis is unrepresentable.
 */
type BarChartRootProps<
	TDatum extends ChartDatum = ChartDatum,
	TMode extends ChartMode = "interactive",
> = Omit<ChartRootBaseProps, "yDomain"> &
	ChartAccessibilityProps<TMode> & {
		/** Rows of data; each `BarChart.Bar` reads one numeric key per row. */
		data: readonly TDatum[];
		/**
		 * The key of each row's category (x) value. If no row has the key, the Root throws.
		 */
		xKey: Extract<keyof TDatum, string>;
		/** Override the automatic y maximum. The minimum is always the zero baseline. */
		yDomain?: [0, number | "auto"];
		/**
		 * The direction the bars point — this names the bars, not an axis.
		 * `"vertical"` (default) bars stand up from a bottom baseline with
		 * categories along the x axis; `"horizontal"` bars run rightward from a
		 * left baseline with categories down the y axis — better for long category
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
	 * `null` for no value. A row with no value renders a gap.
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
	 * to the bar's length (`"perpendicular"` — horizontal lines on vertical
	 * bars), rungs parallel to it (`"parallel"` — vertical lines on vertical
	 * bars), the orthogonal lattice of both rung directions (`"grid"`), or an
	 * offset dot field (`"dots"`).
	 *
	 * The two rung textures flip with the Root's `orientation`, in opposite
	 * senses. Every other value is direction-free, `"grid"` included — it is the
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
 * `bar-chart-data-table`. A bar chart shows the band and never the crosshair
 * or the markers. The surface and the three layers are engine-owned: absent
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
 * | `data-slot` | `"bar-chart-data-table"` | The `sr-only` data table. Mounts once focus lands inside the chart (`data-state` flips to `"engaged"`) and stays. Interactive charts only. |
 * | `data-state` | `"dormant"` \| `"engaged"` | On the Root. Flips to `"engaged"` once focus lands inside the chart, and never flips back. The data table mounts with it. Visibility paints the chart but never flips it. Interactive charts only. |
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
 * One bar series. Renders nothing itself — it registers the series with the
 * chart, which paints it. Compose one `Bar` per series; with
 * `stacked` on the Root, bars stack from the baseline up in registration
 * order, so a `Bar` that mounts later stacks on top whatever its position in
 * the JSX. `texture` adds a pattern fill as a redundant identity encoding
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
 * Customizes the hover/keyboard tooltip readout. The tooltip itself is part
 * of `BarChart.Root`'s interaction contract and renders even when this part is
 * absent — compose it to format the label or values, append a footer, or
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
 * flow below the plot. Always compose it on multi-series charts — identity
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
 * of one per chart. Each chart keeps its own tooltip, description, and data
 * table.
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

/**
 * A bar chart for comparing values across categories, with
 * grouped and stacked variants. Each series names its own `color`. Interaction ships
 * with `Root` unconditionally: a per-category tooltip, keyboard stepping,
 * aria-live announcements, and an sr-only description. A Root builds and paints
 * its surface once it comes within one viewport of the visible area, takes
 * focus, or prints, and it mounts its sr-only data table once focus lands
 * inside it.
 *
 * **CSS variables (public API):**
 *
 * | CSS Variable | Default | Description |
 * | --- | --- | --- |
 * | `--color-chart-<name>` | per theme | The color a series with `color="<name>"` paints. Every mantle color name has one, tuned for 3:1 contrast on the card surface. |
 *
 * Two ways to change a series color, both public API. The `color` prop on
 * `BarChart.Bar` takes a color name or any CSS color. To restyle a color name
 * for one chart, redeclare its token on `Root`:
 * `className="[--color-chart-blue:var(--color-brand)]"`. Every token resolves in
 * `Root`'s own cascade, so a declaration scoped there wins for
 * that chart and leaves every other chart on the page alone.
 *
 * @useWhen Compare values across categories, with grouped or stacked bars.
 *
 * @siblings
 * - `LineChart`: the chart shows a trend across an ordered x axis, such as time.
 * - `AreaChart`: a total and its parts change across an ordered x axis, such as time.
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
 * ├── BarChart.Legend
 * └── BarChart.CopyButton
 * ```
 *
 * A List groups Roots:
 * ```
 * BarChart.List
 * └── BarChart.Root (one per chart)
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
 *   <BarChart.Bar dataKey="desktop" label="Desktop" color="blue" />
 *   <BarChart.Bar dataKey="mobile" label="Mobile" color="emerald" />
 *   <BarChart.Tooltip />
 *   <BarChart.Legend />
 * </BarChart.Root>
 * ```
 */
const BarChart = {
	/**
	 * The root of a bar chart: owns the data, the scales, the renderer,
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
	 *   <BarChart.Bar dataKey="desktop" label="Desktop" color="blue" />
	 *   <BarChart.Bar dataKey="mobile" label="Mobile" color="emerald" />
	 *   <BarChart.Tooltip />
	 *   <BarChart.Legend />
	 * </BarChart.Root>
	 * ```
	 */
	Root,
	/**
	 * One bar series; registers with the chart, which paints it.
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
	 *   <BarChart.Tooltip />
	 *   <BarChart.Legend />
	 * </BarChart.Root>
	 * ```
	 */
	Bar,
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
	 *   <BarChart.Bar dataKey="mobile" label="Mobile" color="emerald" />
	 *   <BarChart.Tooltip />
	 *   <BarChart.Legend />
	 * </BarChart.Root>
	 * ```
	 */
	Grid,
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
	 *   <BarChart.Bar dataKey="mobile" label="Mobile" color="emerald" />
	 *   <BarChart.Tooltip />
	 *   <BarChart.Legend />
	 * </BarChart.Root>
	 * ```
	 */
	XAxis,
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
	 *   <BarChart.Bar dataKey="mobile" label="Mobile" color="emerald" />
	 *   <BarChart.Tooltip />
	 *   <BarChart.Legend />
	 * </BarChart.Root>
	 * ```
	 */
	YAxis,
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
	 *   <BarChart.Bar dataKey="desktop" label="Desktop" color="blue" />
	 *   <BarChart.Bar dataKey="mobile" label="Mobile" color="emerald" />
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
	 *   <BarChart.Bar dataKey="desktop" label="Desktop" color="blue" />
	 *   <BarChart.Bar dataKey="mobile" label="Mobile" color="emerald" />
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
	 *   <BarChart.Bar dataKey="desktop" label="Desktop" color="blue" />
	 *   <BarChart.Bar dataKey="mobile" label="Mobile" color="emerald" />
	 *   <BarChart.Legend />
	 *   <BarChart.CopyButton />
	 * </BarChart.Root>
	 * ```
	 */
	CopyButton,
	/**
	 * Groups a list of charts so they share one live region.
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
	List,
} as const;

export type {
	//,
	BarChartBarProps,
	BarChartCopyButtonProps,
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
	BarChart,
};
