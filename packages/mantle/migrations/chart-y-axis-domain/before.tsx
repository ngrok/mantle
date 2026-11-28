import { AreaChart } from "@ngrok/mantle/area-chart";
import { BarChart } from "@ngrok/mantle/bar-chart";
import { LineChart, LineChart as Trend } from "@ngrok/mantle/line-chart";
import { ScatterPlot } from "@ngrok/mantle/scatter-plot";
import { Chart } from "@acme/charts";

type Point = { day: string; value: number; total: number };

declare const rows: Point[];
declare const ceiling: number;
declare const showAxis: boolean;
declare const formatPercent: (value: number) => string;

export const Line = (
	<LineChart.Root data={rows} xKey="day" yDomain={[0, 100]}>
		<LineChart.YAxis tickFormat={formatPercent} />
		<LineChart.Line dataKey="value" color="blue" />
	</LineChart.Root>
);

export const Bars = (
	<BarChart.Root data={rows} xKey="day" yDomain={[0, ceiling]} aria-label="Pull requests">
		<BarChart.Grid />
		<BarChart.YAxis />
		<BarChart.Bar dataKey="value" color="blue" />
		<LineChart.Line dataKey="total" color="amber" />
	</BarChart.Root>
);

export const Area = (
	<AreaChart.Root data={rows} xKey="day" yDomain={[0, "auto"]}>
		<AreaChart.Area dataKey="value" color="blue" />
		<AreaChart.YAxis tickCount={4} />
	</AreaChart.Root>
);

export const Points = (
	<ScatterPlot.Root data={rows} xKey="day" yDomain={[0, 11000]}>
		<ScatterPlot.YAxis tickCount={4} />
		<ScatterPlot.Point dataKey="value" color="blue" />
	</ScatterPlot.Root>
);

// The aliased import is the same part.
export const Aliased = (
	<Trend.Root data={rows} xKey="day" yDomain={["auto", 500]}>
		<Trend.YAxis />
		<Trend.Line dataKey="value" color="blue" />
	</Trend.Root>
);

// Two axes: the Root's range moves to the left axis only.
export const TwoAxes = (
	<LineChart.Root data={rows} xKey="day" yDomain={[0, 100]}>
		<LineChart.YAxis side="left" />
		<LineChart.YAxis side="right" />
		<LineChart.Line dataKey="value" color="blue" />
		<LineChart.Line dataKey="total" color="amber" yAxis="right" />
	</LineChart.Root>
);

// Negative cases: a Root with no YAxis keeps yDomain for the type checker, a
// YAxis that has a domain stays for a person to merge, a YAxis under a
// condition or in a nested Root stays, another library's chart stays, and a
// shadowed name stays.
export const NoAxis = (
	<LineChart.Root data={rows} xKey="day" yDomain={[0, 100]}>
		<LineChart.Line dataKey="value" color="blue" />
	</LineChart.Root>
);

export const Partial = (
	<LineChart.Root data={rows} xKey="day" yDomain={[0, 100]}>
		<LineChart.YAxis domain={[0, 50]} />
		<LineChart.Line dataKey="value" color="blue" />
	</LineChart.Root>
);

export const Conditional = (
	<LineChart.Root data={rows} xKey="day" yDomain={[0, 100]}>
		{showAxis && <LineChart.YAxis />}
		<LineChart.Line dataKey="value" color="blue" />
	</LineChart.Root>
);

export const Nested = (
	<LineChart.Root data={rows} xKey="day" yDomain={[0, 100]}>
		<LineChart.Line dataKey="value" color="blue" />
		<div>
			<LineChart.Root data={rows} xKey="day">
				<LineChart.YAxis />
				<LineChart.Line dataKey="value" color="blue" />
			</LineChart.Root>
		</div>
	</LineChart.Root>
);

export const Other = (
	<Chart.Root data={rows} yDomain={[0, 100]}>
		<Chart.YAxis />
	</Chart.Root>
);

export function Shadowed({ LineChart }: { LineChart: typeof Chart }) {
	return (
		<LineChart.Root data={rows} yDomain={[0, 100]}>
			<LineChart.YAxis />
		</LineChart.Root>
	);
}
