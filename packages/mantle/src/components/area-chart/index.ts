/**
 * Re-exports for the Area Chart component.
 *
 * @see https://mantle.ngrok.com/components/charts/area-chart
 */

import { logScale } from "../chart/log-scale.js";
import * as AreaChartParts from "./area-chart-parts.js";
/**
 * An area chart for showing how values (and, when stacked, a
 * total and its parts) change over a continuous x axis. Each area fills with
 * a 10% wash of the series color plus a 2px band-edge stroke; the Root-level
 * `stacked` prop stacks the series in registration order from the baseline.
 * Each series names its own `color`. Interaction ships with `Root`
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
 * | `--color-chart-<name>` | per theme | The color a series with `color="<name>"` paints. Every mantle color name has one: the 600 step of its hue in light mode, and the 500 step in dark mode. Most names reach 3:1 contrast on the card surface, and the docs page lists the names that do not. |
 *
 * Two ways to change a series color, both public API. The `color` prop on
 * `AreaChart.Area` takes a color name or any CSS color. To restyle a color name for one chart,
 * redeclare its token on `Root`:
 * `className="[--color-chart-blue:var(--color-brand)]"`. Every token resolves in
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
 *   <AreaChart.Area dataKey="http" label="HTTP" color="blue" />
 *   <AreaChart.Area dataKey="tcp" label="TCP" color="emerald" />
 *   <AreaChart.Tooltip />
 *   <AreaChart.Legend />
 * </AreaChart.Root>
 * ```
 */
const AreaChart = AreaChartParts;

export {
	//,
	AreaChart,
	logScale,
};
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
} from "./area-chart.js";
