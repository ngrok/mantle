import { AreaChart } from "@ngrok/mantle/area-chart";
import { BarChart } from "@ngrok/mantle/bar-chart";
import { LineChart, LineChart as Trend } from "@ngrok/mantle/line-chart";
import { ScatterPlot } from "@ngrok/mantle/scatter-plot";
import { Chart } from "@acme/charts";

type Point = { day: string; value: number; total: number };

declare const rows: Point[];
declare const ceiling: number;
declare const showAxis: boolean;
declare const opts: { yDomain?: [number, number] };
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
// condition or in a nested Root stays, a Root with a second YAxis under a
// condition, in a fragment, with a closing tag, or with a spread stays, a Root
// with its own spread stays, another
// library's chart stays,
// and a name shadowed by a parameter or a loop binding stays.
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

export const SecondAxis = (
	<LineChart.Root data={rows} xKey="day" yDomain={[0, 100]}>
		<LineChart.YAxis />
		{showAxis && <LineChart.YAxis tickCount={2} />}
		<LineChart.Line dataKey="value" color="blue" />
	</LineChart.Root>
);

export const SpreadSibling = (
	<LineChart.Root data={rows} xKey="day" yDomain={[0, 100]}>
		<LineChart.YAxis />
		<LineChart.YAxis {...{ tickCount: 2 }} />
		<LineChart.Line dataKey="value" color="blue" />
	</LineChart.Root>
);

export const Fragment = (
	<LineChart.Root data={rows} xKey="day" yDomain={[0, 100]}>
		<LineChart.YAxis />
		{/* oxlint-disable-next-line react/jsx-no-useless-fragment -- the fragment is the shape under test */}
		<>
			<LineChart.YAxis tickCount={2} />
		</>
		<LineChart.Line dataKey="value" color="blue" />
	</LineChart.Root>
);

export const ClosingTag = (
	<LineChart.Root data={rows} xKey="day" yDomain={[0, 100]}>
		<LineChart.YAxis />
		{/* oxlint-disable-next-line react/self-closing-comp -- the closing tag is the shape under test */}
		<LineChart.YAxis tickCount={2}></LineChart.YAxis>
		<LineChart.Line dataKey="value" color="blue" />
	</LineChart.Root>
);

export const Spread = (
	<LineChart.Root data={rows} xKey="day" yDomain={[0, 10]} {...opts}>
		<LineChart.YAxis />
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

export function Looped() {
	for (const LineChart of [Chart]) {
		return (
			<LineChart.Root data={rows} yDomain={[0, 100]}>
				<LineChart.YAxis />
			</LineChart.Root>
		);
	}
	return null;
}
