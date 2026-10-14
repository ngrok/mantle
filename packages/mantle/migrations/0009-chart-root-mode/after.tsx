import { AreaChart } from "@ngrok/mantle/area-chart";
import { BarChart } from "@ngrok/mantle/bar-chart";
import { LineChart, LineChart as Trend } from "@ngrok/mantle/line-chart";
import { ScatterPlot } from "@ngrok/mantle/scatter-plot";
import { Sparkline } from "@acme/charts";

type Point = { day: string; value: number };

declare const rows: Point[];
declare const isPlaceholder: boolean;
declare const isLoading: boolean;
declare const setting: boolean | undefined;
declare function Divider(props: { decorative?: boolean }): null;

export const Placeholder = (
	<BarChart.Root data={rows} xKey="day" mode="decorative">
		<BarChart.Bar dataKey="value" />
	</BarChart.Root>
);

export const Dynamic = (
	<LineChart.Root data={rows} xKey="day" mode={isPlaceholder ? "decorative" : "interactive"}>
		<LineChart.Line dataKey="value" />
	</LineChart.Root>
);

export const Explicit = (
	<AreaChart.Root data={rows} xKey="day" mode="decorative">
		<AreaChart.Area dataKey="value" />
	</AreaChart.Root>
);

// A ternary or `??` needs parentheses as the test of the new ternary; a
// negation or `||` does not. The aliased import is the same part.
export const Compound = (
	<>
		<Trend.Root
			data={rows}
			xKey="day"
			mode={(isLoading ? isPlaceholder : setting) ? "decorative" : "interactive"}
		>
			<Trend.Line dataKey="value" />
		</Trend.Root>
		<Trend.Root
			data={rows}
			xKey="day"
			mode={(setting ?? isPlaceholder) ? "decorative" : "interactive"}
		>
			<Trend.Line dataKey="value" />
		</Trend.Root>
		<Trend.Root
			data={rows}
			xKey="day"
			mode={isLoading || isPlaceholder ? "decorative" : "interactive"}
		>
			<Trend.Line dataKey="value" />
		</Trend.Root>
		<Trend.Root data={rows} xKey="day" mode={!isLoading ? "decorative" : "interactive"}>
			<Trend.Line dataKey="value" />
		</Trend.Root>
	</>
);

// Negative cases: an interactive chart, a non-chart `decorative` prop, and
// another library's chart stay.
export const Interactive = (
	<ScatterPlot.Root data={rows} xKey="day" yKey="value" aria-label="Latency">
		<ScatterPlot.Points dataKey="value" />
	</ScatterPlot.Root>
);

export const Rule = <Divider decorative />;

export const Foreign = <Sparkline.Root data={rows} decorative />;
