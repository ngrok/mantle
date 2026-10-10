import { AreaChart } from "@ngrok/mantle/area-chart";
import { BarChart } from "@ngrok/mantle/bar-chart";
import { LineChart } from "@ngrok/mantle/line-chart";
import { ScatterPlot } from "@ngrok/mantle/scatter-plot";
import type { Config } from "./config";
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

/** A sparkline: one bar series in a 112×24 cell, no axes, no grid, like a list page's column. */
export const MantleSparkline = ({
	data,
	animate,
	label,
}: {
	data: readonly Row[];
	animate: boolean;
	label: string;
}) => (
	<BarChart.Root
		data={data}
		xKey="x"
		animate={animate}
		aria-label={label}
		className="aspect-auto h-6 w-28"
	>
		<BarChart.Bar dataKey="a" label="Requests" />
		<BarChart.Tooltip />
	</BarChart.Root>
);

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

/** One mantle chart of the configured kind. `mantle-static` turns the mount animation off. */
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
	const animate = config.lib === "mantle";
	switch (config.kind) {
		case "line":
			return <MantleLine data={rows} series={series} animate={animate} label={label} />;
		case "area":
			return <MantleArea data={rows} series={series} animate={animate} label={label} />;
		case "bar":
			return <MantleBar data={rows} series={series} animate={animate} label={label} />;
		case "scatter":
			return <MantleScatter data={points} animate={animate} label={label} />;
	}
};
