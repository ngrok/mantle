/**
 * Re-exports for the Line Chart component.
 *
 * @see https://mantle.ngrok.com/components/charts/line-chart
 */

import { logScale } from "../chart/log-scale.js";
import * as LineChartParts from "./line-chart-parts.js";
/**
 * A line chart for trends over a continuous x, time above
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
const LineChart = LineChartParts;

export {
	//,
	LineChart,
	logScale,
};
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
} from "./line-chart.js";
