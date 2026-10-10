import { AreaChart } from "@ngrok/mantle/area-chart";
import { BarChart } from "@ngrok/mantle/bar-chart";
import { LineChart } from "@ngrok/mantle/line-chart";
import { ScatterPlot } from "@ngrok/mantle/scatter-plot";
import type { Config, Kind } from "./config";
import type { PointRow, Row } from "./data";

type SeriesProps = {
	data: readonly Row[];
	series: 1 | 2;
	animate: boolean;
	label: string;
};

/** A full line chart: grid, both axes, one or two lines, and a tooltip. */
export const MantleLine = ({ data, series, animate, label }: SeriesProps) => (
	<LineChart.Root data={data} xKey="x" animate={animate} aria-label={label}>
		<LineChart.Grid />
		<LineChart.XAxis />
		<LineChart.YAxis />
		<LineChart.Line dataKey="a" label="Requests" />
		{series === 2 && <LineChart.Line dataKey="b" label="Errors" />}
		<LineChart.Tooltip />
	</LineChart.Root>
);

/** A full area chart with the same parts as {@link MantleLine}. */
export const MantleArea = ({ data, series, animate, label }: SeriesProps) => (
	<AreaChart.Root data={data} xKey="x" animate={animate} aria-label={label}>
		<AreaChart.Grid />
		<AreaChart.XAxis />
		<AreaChart.YAxis />
		<AreaChart.Area dataKey="a" label="Requests" />
		{series === 2 && <AreaChart.Area dataKey="b" label="Errors" />}
		<AreaChart.Tooltip />
	</AreaChart.Root>
);

/** A full bar chart with the same parts as {@link MantleLine}. */
export const MantleBar = ({ data, series, animate, label }: SeriesProps) => (
	<BarChart.Root data={data} xKey="x" animate={animate} aria-label={label}>
		<BarChart.Grid />
		<BarChart.XAxis />
		<BarChart.YAxis />
		<BarChart.Bar dataKey="a" label="p50" />
		{series === 2 && <BarChart.Bar dataKey="b" label="p99" />}
		<BarChart.Tooltip />
	</BarChart.Root>
);

type PointProps = { data: readonly PointRow[]; animate: boolean; label: string };

/** A 2D scatter plot with grid, both axes, and a tooltip. */
export const MantleScatter = ({ data, animate, label }: PointProps) => (
	<ScatterPlot.Root data={data} xKey="x" animate={animate} aria-label={label}>
		<ScatterPlot.Grid />
		<ScatterPlot.XAxis />
		<ScatterPlot.YAxis />
		<ScatterPlot.Point dataKey="y" label="Latency" />
		<ScatterPlot.Tooltip />
	</ScatterPlot.Root>
);

/** The 112×24 cell a sparkline fills: no axes, no grid, like a list page's column. */
const SPARKLINE_CLASS = "aspect-auto h-6 w-28";

/**
 * A sparkline of the configured kind: one series in a 112×24 cell, no axes,
 * no grid, in `mode="static"` like the dashboard's list columns. A scatter
 * sparkline reads `points`; the other kinds read `rows`.
 */
export const MantleSparkline = ({
	kind,
	rows,
	points,
	animate,
	label,
}: {
	kind: Kind;
	rows: readonly Row[];
	points: readonly PointRow[];
	animate: boolean;
	label: string;
}) => {
	switch (kind) {
		case "line":
			return (
				<LineChart.Root
					data={rows}
					xKey="x"
					mode="static"
					animate={animate}
					aria-label={label}
					className={SPARKLINE_CLASS}
				>
					<LineChart.Line dataKey="a" label="Requests" />
				</LineChart.Root>
			);
		case "area":
			return (
				<AreaChart.Root
					data={rows}
					xKey="x"
					mode="static"
					animate={animate}
					aria-label={label}
					className={SPARKLINE_CLASS}
				>
					<AreaChart.Area dataKey="a" label="Requests" />
				</AreaChart.Root>
			);
		case "bar":
			return (
				<BarChart.Root
					data={rows}
					xKey="x"
					mode="static"
					animate={animate}
					aria-label={label}
					className={SPARKLINE_CLASS}
				>
					<BarChart.Bar dataKey="a" label="Requests" />
				</BarChart.Root>
			);
		case "scatter":
			return (
				<ScatterPlot.Root
					data={points}
					xKey="x"
					mode="static"
					animate={animate}
					aria-label={label}
					className={SPARKLINE_CLASS}
				>
					<ScatterPlot.Point dataKey="y" label="Latency" />
				</ScatterPlot.Root>
			);
	}
};

/** One mantle chart of the configured kind. */
export const MantleChart = ({
	config,
	rows,
	points,
	label,
}: {
	config: Config;
	rows: readonly Row[];
	points: readonly PointRow[];
	label: string;
}) => {
	const series: 1 | 2 = config.mode === "list" ? 2 : 1;
	switch (config.kind) {
		case "line":
			return <MantleLine data={rows} series={series} animate={config.animate} label={label} />;
		case "area":
			return <MantleArea data={rows} series={series} animate={config.animate} label={label} />;
		case "bar":
			return <MantleBar data={rows} series={series} animate={config.animate} label={label} />;
		case "scatter":
			return <MantleScatter data={points} animate={config.animate} label={label} />;
	}
};
