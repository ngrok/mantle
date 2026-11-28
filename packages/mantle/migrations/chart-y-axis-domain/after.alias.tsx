import { BarChart } from "@ngrok/mantle/bar-chart";
import { LineChart } from "@ngrok/mantle/line-chart";

type Point = { day: string; value: number };

declare const rows: Point[];

// Negative case: a file that reads YAxis outside a tag name keeps every
// yDomain, because the rules cannot follow the alias to the axis it renders.
const Axis = LineChart.YAxis;

export const Aliased = (compact: boolean) => (
	<LineChart.Root data={rows} xKey="day" yDomain={[-100, 100]}>
		<LineChart.YAxis />
		{compact && <Axis tickCount={2} />}
		<LineChart.Line dataKey="value" color="blue" />
	</LineChart.Root>
);

// Another chart's Root in the same file migrates: the alias reads LineChart.
export const Bars = (
	<BarChart.Root data={rows} xKey="day">
		<BarChart.YAxis domain={[0, 100]} />
		<BarChart.Bar dataKey="value" color="blue" />
	</BarChart.Root>
);
