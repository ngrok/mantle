import { AreaChart } from "@ngrok/mantle/area-chart";
import { BarChart } from "@ngrok/mantle/bar-chart";
import { LineChart, LineChart as Trend } from "@ngrok/mantle/line-chart";
import { ScatterPlot } from "@ngrok/mantle/scatter-plot";
import { BarChart as OtherBarChart } from "@acme/charts";

type Point = { day: string; a: number; b: number; c: number };

declare const rows: Point[];
declare const isError: boolean;
declare const slot: 1 | 2;
declare const overrides: Record<string, string>;
declare const tone: string;

export const Tokens = (
	<BarChart.Root data={rows} xKey="day">
		<BarChart.Bar dataKey="a" color="blue" />
		<BarChart.Bar dataKey="b" color="emerald" />
		<BarChart.Bar dataKey="c" color={"neutral"} />
	</BarChart.Root>
);

export const Ternary = (
	<LineChart.Root data={rows} xKey="day">
		<LineChart.Line dataKey="a" color={isError ? "pink" : "orange"} />
	</LineChart.Root>
);

// The aliased import is the same part.
export const Aliased = (
	<Trend.Root data={rows} xKey="day">
		<Trend.Line dataKey="a" color="teal" />
		<Trend.Line dataKey="b" color="fuchsia" />
		<Trend.Line dataKey="c" color="violet" />
	</Trend.Root>
);

export const Slots = (
	<AreaChart.Root data={rows} xKey="day">
		<AreaChart.Area dataKey="a" color="amber" />
		<AreaChart.Area dataKey="b" color="neutral" />
		<AreaChart.Area dataKey="c" color="var(--color-brand)" />
	</AreaChart.Root>
);

export const Points = (
	<ScatterPlot.Root data={rows} xKey="a">
		<ScatterPlot.Point dataKey="b" color="blue" shape="square" />
	</ScatterPlot.Root>
);

// A reference line takes the same color names.
export const ReferenceLines = (
	<>
		<LineChart.ReferenceLine y={1} color="emerald" />
		<BarChart.ReferenceLine y={1} color="pink" />
		<AreaChart.ReferenceLine y={1} color="neutral" />
		<ScatterPlot.ReferenceLine y={1} color="amber" />
	</>
);

export const Classes = (
	<div className="bg-chart-blue text-chart-neutral divide-chart-emerald border-x-chart-orange [--color-chart-pink:var(--color-brand)]">
		<span style={{ backgroundColor: "var(--color-chart-amber)" }} />
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

// A lookup key and a compared operand are not the color, so they stay.
export const Lookup = (
	<BarChart.Root data={rows} xKey="day">
		<BarChart.Bar dataKey="a" color={overrides["chart-1"]} />
		<BarChart.Bar dataKey="b" color={tone === "chart-2" ? "pink" : "orange"} />
	</BarChart.Root>
);

export const Prose = <p title="chart-1">see chart-12 and my-chart-1</p>;

// A parameter under the import's name shadows it.
export const Shadowed = (BarChart: typeof OtherBarChart) => (
	<BarChart.Root data={rows}>
		<BarChart.Bar dataKey="a" color="chart-1" />
	</BarChart.Root>
);
