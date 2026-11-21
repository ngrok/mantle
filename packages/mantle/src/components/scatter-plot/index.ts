/**
 * Re-exports for the Scatter Plot component.
 *
 * @see https://mantle.ngrok.com/components/charts/scatter-plot
 */

import * as ScatterPlotParts from "./scatter-plot-parts.js";
/**
 * A canvas-rendered scatter plot for correlating two measures, or three with
 * the 3D projection (`zKey`), which renders a rotatable, depth-sorted point
 * cloud (drag to orbit). Hover hits the nearest point within 24px; keyboard
 * stepping, polite announcements, and the sr-only description ship with
 * `Root` unconditionally. A Root builds and paints its canvas once it comes
 * within one viewport of the visible area, takes focus, or prints, and it mounts
 * its sr-only data table once focus lands inside it. Keep it to eight series
 * or fewer: the top seven, plus an "Other" series in `"neutral"`. Scatter is
 * an all-pairs chart form, and mantle does not guarantee that any set of
 * colors stays apart.
 *
 * **CSS variables (public API):**
 *
 * | CSS Variable | Default | Description |
 * | --- | --- | --- |
 * | `--color-chart-<name>` | per theme | The color a series with `color="<name>"` paints. Every mantle color name has one: the 600 step of its hue in light mode, and the 500 step in dark mode. Most names reach 3:1 contrast on the card surface, and the docs page lists the names that do not. |
 *
 * Two ways to change a series color, both public API. The `color` prop on
 * `ScatterPlot.Point` takes a color name or any CSS color. To restyle a color name for one chart,
 * redeclare its token on `Root`:
 * `className="[--color-chart-blue:var(--color-brand)]"`. The engine resolves every
 * token from `Root`'s computed style, so a declaration scoped there wins for
 * that chart and leaves every other chart on the page alone.
 *
 * @useWhen Show how two measures correlate across many points, or three measures in a rotatable 3D
 * view.
 *
 * @siblings
 * - `LineChart`: one measure trends across an ordered x axis, such as time.
 * - `BarChart`: values compare across categories.
 *
 * @see https://mantle.ngrok.com/components/charts/scatter-plot
 *
 * @example
 * Composition:
 * ```
 * ScatterPlot.Root
 * ├── ScatterPlot.Grid
 * ├── ScatterPlot.XAxis
 * ├── ScatterPlot.YAxis
 * ├── ScatterPlot.Point (one per series)
 * ├── ScatterPlot.ReferenceLine
 * ├── ScatterPlot.Tooltip
 * ├── ScatterPlot.Legend
 * └── ScatterPlot.CopyButton
 * ```
 *
 * A List groups Roots:
 * ```
 * ScatterPlot.List
 * └── ScatterPlot.Root (one per chart)
 * ```
 *
 * @example
 * ```tsx
 * const data = [
 *   { latency: 12, throughputA: 840, throughputB: 720 },
 *   { latency: 28, throughputA: 610, throughputB: 590 },
 *   { latency: 45, throughputA: 340, throughputB: 410 },
 * ];
 *
 * <ScatterPlot.Root data={data} xKey="latency" aria-label="Latency vs throughput">
 *   <ScatterPlot.Grid />
 *   <ScatterPlot.XAxis />
 *   <ScatterPlot.YAxis />
 *   <ScatterPlot.Point dataKey="throughputA" label="Region A" color="blue" />
 *   <ScatterPlot.Point dataKey="throughputB" label="Region B" color="emerald" />
 *   <ScatterPlot.Tooltip />
 *   <ScatterPlot.Legend />
 * </ScatterPlot.Root>
 * ```
 */
const ScatterPlot = ScatterPlotParts;

export {
	//,
	ScatterPlot,
};
export type {
	//,
	ChartDatumEvent,
	ChartMode,
	ScatterPlotCopyButtonProps,
	ScatterPlotGridProps,
	ScatterPlotLegendProps,
	ScatterPlotListProps,
	ScatterPlotPointProps,
	ScatterPlotReferenceLineProps,
	ScatterPlotRootProps,
	ScatterPlotTooltipProps,
	ScatterPlotXAxisProps,
	ScatterPlotYAxisProps,
} from "./scatter-plot.js";
