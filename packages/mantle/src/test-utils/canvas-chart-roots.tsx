import type { AreaChartRootProps } from "../components/area-chart/index.js";
import type { BarChartRootProps } from "../components/bar-chart/index.js";
import { createCanvasBackend } from "../components/chart/canvas-backend.js";
import type { ChartMode } from "../components/chart/primitive.js";
import { ChartRootPrimitive } from "../components/chart/primitive.js";
import type { ChartDatum } from "../components/chart/types.js";
import type { LineChartRootProps } from "../components/line-chart/index.js";

/**
 * Bar, Line, and Area Roots that paint on the canvas backend, for browser
 * tests only. The shipped Roots paint SVG. Both backends draw the same calls
 * from `renderer.ts`, so a test reads canvas pixels to pin the geometry, and
 * the parity test uses the canvas as the reference for the SVG.
 *
 * @example
 * ```tsx
 * render(
 *   <CanvasBarChartRoot data={data} xKey="month" aria-label="Visitors">
 *     <BarChart.Bar dataKey="desktop" label="Desktop" />
 *   </CanvasBarChartRoot>,
 * );
 * ```
 */
export const CanvasBarChartRoot = <
	TDatum extends ChartDatum = ChartDatum,
	TMode extends ChartMode = "interactive",
>(
	props: BarChartRootProps<TDatum, TMode>,
) => (
	<ChartRootPrimitive
		kind="bar"
		componentName="BarChart"
		slotName="bar-chart"
		paintBackend={createCanvasBackend}
		{...props}
	/>
);

/**
 * A Line Root on the canvas backend. See {@link CanvasBarChartRoot}.
 *
 * @example
 * ```tsx
 * <CanvasLineChartRoot data={data} xKey="time" aria-label="Latency">
 *   <LineChart.Line dataKey="p50" label="p50" />
 * </CanvasLineChartRoot>
 * ```
 */
export const CanvasLineChartRoot = <
	TDatum extends ChartDatum = ChartDatum,
	TMode extends ChartMode = "interactive",
>(
	props: LineChartRootProps<TDatum, TMode>,
) => (
	<ChartRootPrimitive
		kind="line"
		componentName="LineChart"
		slotName="line-chart"
		paintBackend={createCanvasBackend}
		{...props}
	/>
);

/**
 * An Area Root on the canvas backend. See {@link CanvasBarChartRoot}.
 *
 * @example
 * ```tsx
 * <CanvasAreaChartRoot data={data} xKey="time" stacked aria-label="Traffic">
 *   <AreaChart.Area dataKey="http" label="HTTP" />
 * </CanvasAreaChartRoot>
 * ```
 */
export const CanvasAreaChartRoot = <
	TDatum extends ChartDatum = ChartDatum,
	TMode extends ChartMode = "interactive",
>(
	props: AreaChartRootProps<TDatum, TMode>,
) => (
	<ChartRootPrimitive
		kind="area"
		componentName="AreaChart"
		slotName="area-chart"
		paintBackend={createCanvasBackend}
		{...props}
	/>
);
