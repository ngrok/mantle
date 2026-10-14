import { AreaChart } from "@ngrok/mantle/area-chart";
import { BarChart } from "@ngrok/mantle/bar-chart";
import { LineChart } from "@ngrok/mantle/line-chart";
import { ScatterPlot } from "@ngrok/mantle/scatter-plot";

type Point = { day: string; value: number };

declare const rows: Point[];
declare const isPlaceholder: boolean;
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

// Negative cases: an interactive chart and a non-chart `decorative` prop stay.
export const Interactive = (
	<ScatterPlot.Root data={rows} xKey="day" yKey="value" aria-label="Latency">
		<ScatterPlot.Points dataKey="value" />
	</ScatterPlot.Root>
);

export const Rule = <Divider decorative />;
