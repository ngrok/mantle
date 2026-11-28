/**
 * Re-exports for the Bar Chart component.
 *
 * @see https://mantle.ngrok.com/components/charts/bar-chart
 */

import { logScale } from "../chart/log-scale.js";
import * as BarChartParts from "./bar-chart-parts.js";
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
 * | `--color-chart-<name>` | per theme | The color a series with `color="<name>"` paints. Every mantle color name has one: the 600 step of its hue in light mode, and the 500 step in dark mode. Most names reach 3:1 contrast on the card surface, and the docs page lists the names that do not. |
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
 * │   └── BarChart.AxisTitle
 * ├── BarChart.YAxis
 * │   └── BarChart.AxisTitle
 * ├── BarChart.Bar (one per series)
 * ├── BarChart.ReferenceLine
 * ├── BarChart.EmptySlot
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
const BarChart = BarChartParts;

export {
	//,
	BarChart,
	logScale,
};
export type {
	//,
	BarChartAxisTitleProps,
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
} from "./bar-chart.js";
