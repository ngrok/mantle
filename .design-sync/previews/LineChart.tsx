import { LineChart } from "@ngrok/mantle";

const start = new Date("2026-07-18T10:00:00Z").getTime();

const latencyData = Array.from({ length: 30 }, (_, minute) => ({
	time: new Date(start + minute * 60_000),
	p50: Math.round(120 + 18 * Math.sin(minute / 4) + 6 * Math.sin(minute / 1.7)),
	p95: Math.round(310 + 50 * Math.sin(minute / 5 + 0.5) + 16 * Math.sin(minute / 2)),
	p99: Math.round(480 + 80 * Math.sin(minute / 5 + 1) + 24 * Math.sin(minute / 2.3)),
}));

const requestsData = Array.from({ length: 60 }, (_, minute) => ({
	time: new Date(start + minute * 60_000),
	requests: Math.round(1200 + 260 * Math.sin(minute / 5) + 90 * Math.sin(minute / 1.9)),
}));

const signupsData = [
	{ day: "Mon", thisWeek: 42, lastWeek: 38 },
	{ day: "Tue", thisWeek: 61, lastWeek: 47 },
	{ day: "Wed", thisWeek: 55, lastWeek: 60 },
	{ day: "Thu", thisWeek: 67, lastWeek: 52 },
	{ day: "Fri", thisWeek: 74, lastWeek: 66 },
	{ day: "Sat", thisWeek: 30, lastWeek: 34 },
	{ day: "Sun", thisWeek: 26, lastWeek: 22 },
];

const errorRateData = Array.from({ length: 24 }, (_, hour) => ({
	time: new Date(Date.UTC(2026, 6, 17, hour)),
	errorRate: Number((0.62 + 0.35 * Math.sin(hour / 3) + 0.22 * Math.sin(hour / 1.3)).toFixed(2)),
}));

export const LatencyPercentiles = () => (
	<LineChart.Root
		data={latencyData}
		xKey="time"
		aria-label="Request latency by percentile"
		className="h-64"
	>
		<LineChart.Grid />
		<LineChart.XAxis />
		<LineChart.YAxis tickFormat={(value: number) => `${value}ms`} />
		<LineChart.Line dataKey="p50" label="p50" />
		<LineChart.Line dataKey="p95" label="p95" />
		<LineChart.Line dataKey="p99" label="p99" />
		<LineChart.Tooltip valueFormat={(value: number) => `${value}ms`} />
		<LineChart.Legend />
	</LineChart.Root>
);

export const RequestsPerMinute = () => (
	<LineChart.Root data={requestsData} xKey="time" aria-label="Requests per minute" className="h-64">
		<LineChart.Grid />
		<LineChart.XAxis />
		<LineChart.YAxis />
		<LineChart.Line dataKey="requests" label="Requests" />
		<LineChart.Tooltip />
	</LineChart.Root>
);

export const CurveWithMarkers = () => (
	<LineChart.Root
		data={signupsData}
		xKey="day"
		aria-label="Signups by day of week"
		className="h-64"
	>
		<LineChart.Grid />
		<LineChart.XAxis />
		<LineChart.YAxis />
		<LineChart.Line dataKey="thisWeek" label="This week" curve="monotone" markers />
		<LineChart.Line dataKey="lastWeek" label="Last week" curve="monotone" markers />
		<LineChart.Tooltip />
		<LineChart.Legend />
	</LineChart.Root>
);

export const ErrorRateAgainstSlo = () => (
	<LineChart.Root
		data={errorRateData}
		xKey="time"
		yDomain={[0, "auto"]}
		aria-label="Error rate against the SLO"
		className="h-64"
	>
		<LineChart.Grid />
		<LineChart.XAxis />
		<LineChart.YAxis tickFormat={(value: number) => `${value}%`} />
		<LineChart.Line dataKey="errorRate" label="Error rate" color="var(--color-danger-600)" />
		<LineChart.ReferenceLine y={1} label="SLO" />
		<LineChart.Tooltip valueFormat={(value: number) => `${value}%`} />
	</LineChart.Root>
);
