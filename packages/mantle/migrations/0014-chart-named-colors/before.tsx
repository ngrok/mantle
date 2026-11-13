import { AreaChart } from "@ngrok/mantle/area-chart";
import { BarChart } from "@ngrok/mantle/bar-chart";
import { LineChart, LineChart as Trend } from "@ngrok/mantle/line-chart";
import { ScatterPlot } from "@ngrok/mantle/scatter-plot";
import { BarChart as OtherBarChart } from "@acme/charts";

type Point = { day: string; a: number; b: number; c: number };

declare const rows: Point[];
declare const isError: boolean;
declare const slot: 1 | 2;

export const Tokens = (
	<BarChart.Root data={rows} xKey="day">
		<BarChart.Bar dataKey="a" color="chart-1" />
		<BarChart.Bar dataKey="b" color='chart-2' />
		<BarChart.Bar dataKey="c" color={"chart-other"} />
	</BarChart.Root>
);

export const Ternary = (
	<LineChart.Root data={rows} xKey="day">
		<LineChart.Line dataKey="a" color={isError ? "chart-3" : "chart-4"} />
	</LineChart.Root>
);

// The aliased import is the same part.
export const Aliased = (
	<Trend.Root data={rows} xKey="day">
		<Trend.Line dataKey="a" color="chart-5" />
		<Trend.Line dataKey="b" color="chart-6" />
		<Trend.Line dataKey="c" color="chart-7" />
	</Trend.Root>
);

export const Slots = (
	<AreaChart.Root data={rows} xKey="day">
		<AreaChart.Area dataKey="a" seriesSlot={8} />
		<AreaChart.Area dataKey="b" seriesSlot="other" />
		<AreaChart.Area dataKey="c" seriesSlot={2} color="var(--color-brand)" />
	</AreaChart.Root>
);

export const Points = (
	<ScatterPlot.Root data={rows} xKey="a">
		<ScatterPlot.Point dataKey="b" seriesSlot={1} shape="square" />
	</ScatterPlot.Root>
);

export const Classes = (
	<div className="bg-chart-1 text-chart-other [--color-chart-3:var(--color-brand)]">
		<span style={{ backgroundColor: "var(--color-chart-8)" }} />
	</div>
);

// Negative cases: a dynamic slot, a CSS color, another library's chart, and a
// string that is not a token stay.
export const Dynamic = (
	<BarChart.Root data={rows} xKey="day">
		<BarChart.Bar dataKey="a" seriesSlot={slot} />
		<BarChart.Bar dataKey="b" color="#e40014" />
	</BarChart.Root>
);

export const Foreign = (
	<OtherBarChart.Root data={rows}>
		<OtherBarChart.Bar dataKey="a" color="chart-1" seriesSlot={2} />
	</OtherBarChart.Root>
);

export const Prose = <p title="chart-1">see chart-12 and my-chart-1</p>;

// A parameter under the import's name shadows it.
export const Shadowed = (BarChart: typeof OtherBarChart) => (
	<BarChart.Root data={rows}>
		<BarChart.Bar dataKey="a" color="chart-1" />
	</BarChart.Root>
);
