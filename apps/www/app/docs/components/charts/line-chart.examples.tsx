import { Empty } from "@ngrok/mantle/empty";
import { LineChart, logScale } from "@ngrok/mantle/line-chart";
import { useEffect, useState } from "react";

import { PreviewCanvas } from "~/components/preview-canvas";

export const latencyStart = new Date("2026-07-18T10:00:00Z").getTime();

export const latencyPoint = (minute: number) => ({
	time: new Date(latencyStart + minute * 60_000),
	p50: Math.round(120 + 18 * Math.sin(minute / 4) + 6 * Math.sin(minute / 1.7)),
	p99: Math.round(480 + 80 * Math.sin(minute / 5 + 1) + 24 * Math.sin(minute / 2.3)),
});

export const latencyData = Array.from({ length: 30 }, (_, minute) => latencyPoint(minute));

export function LatencyExample() {
	return (
		<LineChart.Root data={latencyData} xKey="time" aria-label="Request latency by percentile">
			<LineChart.Grid />
			<LineChart.XAxis />
			<LineChart.YAxis tickFormat={(value) => `${value}ms`} />
			<LineChart.Line dataKey="p50" label="p50" color="blue" />
			<LineChart.Line dataKey="p99" label="p99" color="emerald" />
			<LineChart.Tooltip valueFormat={(value) => `${value}ms`} />
			<LineChart.Legend />
		</LineChart.Root>
	);
}

export function AxisTitlesLineChartExample() {
	return (
		<LineChart.Root data={latencyData} xKey="time" aria-label="Request latency by percentile">
			<LineChart.Grid />
			<LineChart.XAxis>
				<LineChart.AxisTitle>Time of request</LineChart.AxisTitle>
			</LineChart.XAxis>
			<LineChart.YAxis tickFormat={(value) => `${value}ms`}>
				<LineChart.AxisTitle>Latency</LineChart.AxisTitle>
			</LineChart.YAxis>
			<LineChart.Line dataKey="p50" label="p50" color="blue" />
			<LineChart.Line dataKey="p99" label="p99" color="emerald" />
			<LineChart.Tooltip valueFormat={(value) => `${value}ms`} />
			<LineChart.Legend />
		</LineChart.Root>
	);
}

export function CopyMarkdownExample() {
	return (
		<LineChart.Root data={latencyData} xKey="time" aria-label="Request latency, copyable">
			<LineChart.Grid />
			<LineChart.XAxis />
			<LineChart.YAxis tickFormat={(value) => `${value}ms`} />
			<LineChart.Line dataKey="p50" label="p50" color="blue" />
			<LineChart.Line dataKey="p99" label="p99" color="emerald" />
			<LineChart.Tooltip valueFormat={(value) => `${value}ms`} />
			<LineChart.Legend />
			<LineChart.CopyButton className="absolute right-0 top-0" />
		</LineChart.Root>
	);
}

export const signupsData = [
	{ day: "Mon", thisWeek: 42, lastWeek: 38 },
	{ day: "Tue", thisWeek: 61, lastWeek: 47 },
	{ day: "Wed", thisWeek: 55, lastWeek: 60 },
	{ day: "Thu", thisWeek: 67, lastWeek: 52 },
	{ day: "Fri", thisWeek: 74, lastWeek: 66 },
	{ day: "Sat", thisWeek: 30, lastWeek: 34 },
	{ day: "Sun", thisWeek: 26, lastWeek: 22 },
];

export function CurveMarkersExample() {
	return (
		<LineChart.Root data={signupsData} xKey="day" aria-label="Signups by day of week">
			<LineChart.Grid />
			<LineChart.XAxis />
			<LineChart.YAxis />
			<LineChart.Line dataKey="thisWeek" label="This week" curve="monotone" markers color="blue" />
			<LineChart.Line
				dataKey="lastWeek"
				label="Last week"
				curve="monotone"
				markers
				color="emerald"
				shape="square"
			/>
			<LineChart.Tooltip />
			<LineChart.Legend />
		</LineChart.Root>
	);
}

export function seededWalk(count: number, seed: number) {
	// Deterministic LCG (Numerical Recipes constants): the docs render
	// identically on every load, no Math.random.
	let state = seed >>> 0;
	const nextRandom = () => {
		state = (state * 1664525 + 1013904223) >>> 0;
		return state / 4294967296;
	};
	let value = 250;
	return Array.from({ length: count }, (_, sample) => {
		value += nextRandom() * 2 - 1;
		return { sample, value: Math.round(value * 100) / 100 };
	});
}

export const walkData = seededWalk(50_000, 20_260_718);

export function HighDensityExample() {
	return (
		<LineChart.Root data={walkData} xKey="sample" aria-label="Seeded random walk, 50,000 samples">
			<LineChart.Grid />
			<LineChart.XAxis />
			<LineChart.YAxis />
			<LineChart.Line dataKey="value" label="Value" color="blue" />
			<LineChart.Tooltip />
		</LineChart.Root>
	);
}

export const sensorData = [
	{ hour: "00:00", roof: 21.1, lobby: 20.9 },
	{ hour: "02:00", roof: 20.4, lobby: 20.7 },
	{ hour: "04:00", roof: null, lobby: null },
	{ hour: "06:00", roof: null, lobby: null },
	{ hour: "08:00", roof: 22.8, lobby: 21.4 },
	{ hour: "10:00", roof: 25.2, lobby: 21.9 },
	{ hour: "12:00", roof: 27.6, lobby: 22.3 },
	{ hour: "14:00", roof: 28.1, lobby: 22.5 },
	{ hour: "16:00", roof: 26.9, lobby: 22.2 },
	{ hour: "18:00", roof: 24.3, lobby: 21.8 },
	{ hour: "20:00", roof: 22.6, lobby: 21.3 },
	{ hour: "22:00", roof: 21.7, lobby: 21.0 },
];

export function GapsExample() {
	return (
		<LineChart.Root
			data={sensorData}
			xKey="hour"
			aria-label="Sensor temperature with an outage window"
		>
			<LineChart.Grid />
			<LineChart.XAxis />
			<LineChart.YAxis tickFormat={(value) => `${value}°C`} />
			<LineChart.Line dataKey="roof" label="Roof (gaps)" color="blue" />
			<LineChart.Line dataKey="lobby" label="Lobby (connectNulls)" connectNulls color="emerald" />
			<LineChart.Tooltip valueFormat={(value) => `${value}°C`} />
			<LineChart.Legend />
		</LineChart.Root>
	);
}

export const errorRateData = Array.from({ length: 24 }, (_, hour) => ({
	time: new Date(Date.UTC(2026, 6, 17, hour)),
	errorRate: Number((0.62 + 0.35 * Math.sin(hour / 3) + 0.22 * Math.sin(hour / 1.3)).toFixed(2)),
}));

export function ReferenceLineExample() {
	return (
		<LineChart.Root data={errorRateData} xKey="time" aria-label="Error rate against the SLO">
			<LineChart.Grid />
			<LineChart.XAxis />
			<LineChart.YAxis domain={[0, "auto"]} tickFormat={(value) => `${value}%`} />
			<LineChart.Line dataKey="errorRate" label="Error rate" color="danger" />
			<LineChart.ReferenceLine y={1} label="SLO" />
			<LineChart.Tooltip valueFormat={(value) => `${value}%`} />
		</LineChart.Root>
	);
}

export const trafficPoint = (minute: number) => ({
	time: new Date(latencyStart + minute * 60_000),
	requests: Math.round(1200 + 260 * Math.sin(minute / 5) + 90 * Math.sin(minute / 1.9)),
	errors: Math.round(14 + 9 * Math.sin(minute / 3.2 + 2) + 4 * Math.sin(minute / 1.4)),
});

export const trafficData = Array.from({ length: 60 }, (_, minute) => trafficPoint(minute));

export function LinkedChartsDemo() {
	const [activeIndex, setActiveIndex] = useState<number | null>(null);
	return (
		<div className="flex w-full flex-col gap-4">
			<LineChart.Root
				data={trafficData}
				xKey="time"
				aria-label="Requests per minute"
				activeIndex={activeIndex}
				onActiveIndexChange={setActiveIndex}
				className="aspect-3/1"
			>
				<LineChart.Grid />
				<LineChart.XAxis />
				<LineChart.YAxis />
				<LineChart.Line dataKey="requests" label="Requests" color="blue" />
				<LineChart.Tooltip />
			</LineChart.Root>
			<LineChart.Root
				data={trafficData}
				xKey="time"
				aria-label="Errors per minute"
				activeIndex={activeIndex}
				onActiveIndexChange={setActiveIndex}
				className="aspect-3/1"
			>
				<LineChart.Grid />
				<LineChart.XAxis />
				<LineChart.YAxis />
				<LineChart.Line dataKey="errors" label="Errors" color="danger" />
				<LineChart.Tooltip />
			</LineChart.Root>
		</div>
	);
}

export const liveStart = new Date("2026-07-18T12:00:00Z").getTime();

export const formatClock = new Intl.DateTimeFormat("en-US", {
	hour: "2-digit",
	minute: "2-digit",
	second: "2-digit",
	hour12: false,
	timeZone: "UTC",
});

export function livePoint(tick: number) {
	const drift = Math.sin(tick / 160);
	const wave = Math.sin(tick / 14);
	const ripple = Math.sin(tick / 5.3);
	return {
		time: new Date(liveStart + tick * 150),
		p50: Math.round(120 + 12 * drift + 14 * wave + 5 * ripple),
		p99: Math.round(470 + 45 * Math.sin(tick / 130 + 2) + 48 * wave + 20 * ripple),
	};
}

export const weeklyTokens = [
	{ week: "Apr 20", uncached: 3_874_487, cached: 78_082_526, output: 606_678 },
	{ week: "Apr 27", uncached: 7_645_946, cached: 254_519_999, output: 726_881 },
	{ week: "May 4", uncached: 2_885_324, cached: 121_050_752, output: 282_128 },
	{ week: "May 11", uncached: 10_309_560, cached: 344_972_032, output: 827_846 },
	{ week: "May 18", uncached: 15_866_022, cached: 637_270_656, output: 1_288_182 },
	{ week: "May 25", uncached: 11_077_746, cached: 318_710_272, output: 892_938 },
	{ week: "Jun 1", uncached: 33_380_099, cached: 837_972_608, output: 2_834_083 },
	{ week: "Jun 8", uncached: 28_875_156, cached: 794_703_104, output: 2_407_530 },
	{ week: "Jun 15", uncached: 104_155_857, cached: 2_196_467_968, output: 6_420_826 },
];

export const compactTokens = new Intl.NumberFormat("en-US", { notation: "compact" });

export function TwoYAxesLineChartExample() {
	return (
		<LineChart.Root data={weeklyTokens} xKey="week" aria-label="LLM token consumption by week">
			<LineChart.Grid />
			<LineChart.XAxis />
			<LineChart.YAxis domain={[0, "auto"]} tickFormat={(value) => compactTokens.format(value)} />
			<LineChart.YAxis
				side="right"
				domain={[0, "auto"]}
				tickFormat={(value) => compactTokens.format(value)}
			/>
			<LineChart.Line dataKey="uncached" label="Uncached input" color="blue" />
			<LineChart.Line dataKey="output" label="Output" color="amber" shape="square" />
			<LineChart.Line
				dataKey="cached"
				label="Cached input (right axis)"
				color="neutral"
				shape="diamond"
				yAxis="right"
			/>
			<LineChart.Tooltip />
			<LineChart.Legend />
		</LineChart.Root>
	);
}

export function LiveLineExample() {
	const [tick, setTick] = useState(0);
	useEffect(() => {
		const interval = setInterval(() => {
			setTick((current) => current + 1);
		}, 150);
		return () => clearInterval(interval);
	}, []);
	const data = Array.from({ length: 240 }, (_, index) => livePoint(tick + index));
	return (
		<LineChart.Root data={data} xKey="time" aria-label="Live request latency by percentile">
			<LineChart.Grid />
			<LineChart.XAxis
				tickFormat={(value) => (value instanceof Date ? formatClock.format(value) : String(value))}
			/>
			<LineChart.YAxis tickFormat={(value) => `${value}ms`} />
			<LineChart.Line dataKey="p50" label="p50" color="blue" />
			<LineChart.Line dataKey="p99" label="p99" color="emerald" />
			<LineChart.Tooltip
				valueFormat={(value) => `${value}ms`}
				labelFormat={(value) => (value instanceof Date ? formatClock.format(value) : String(value))}
			/>
			<LineChart.Legend />
		</LineChart.Root>
	);
}

export const placeholderLatency = [120, 138, 126, 152, 141, 168, 150, 162].map((value, index) => ({
	minute: index,
	value,
}));

export function EmptyStateLineChartExample() {
	return (
		<div className="relative w-full">
			<LineChart.Root data={placeholderLatency} xKey="minute" mode="decorative">
				<LineChart.Line dataKey="value" curve="monotone" color="blue" />
			</LineChart.Root>
			<Empty.Root className="absolute inset-0 m-auto h-fit w-fit">
				<Empty.Title>No latency data yet</Empty.Title>
				<Empty.Description>
					<p>Percentile latencies will appear here once requests flow through your endpoints.</p>
				</Empty.Description>
			</Empty.Root>
		</div>
	);
}

export function SeriesIdentityLineChartExample() {
	return (
		<LineChart.Root
			data={signupsData}
			xKey="day"
			// An app declares its brand token once, high in the tree. This example
			// declares it beside the override so it stands alone. A theme that needs
			// its own value takes a variant: `dark:[--color-brand:…]`.
			className="[--color-brand:#d07c00] [--color-chart-blue:var(--color-brand)]"
			aria-label="Signups by day of week"
		>
			<LineChart.Grid />
			<LineChart.XAxis />
			<LineChart.YAxis />
			<LineChart.Line dataKey="thisWeek" label="This week" color="blue" />
			<LineChart.Line dataKey="lastWeek" label="Last week" color="gray" shape="square" />
			<LineChart.Tooltip />
			<LineChart.Legend />
		</LineChart.Root>
	);
}

/** The first example on the Line Chart docs page. */
export function OverviewExample() {
	return (
		<PreviewCanvas>
			<LatencyExample />
		</PreviewCanvas>
	);
}

/** The "Curves, markers, and shapes" example on the Line Chart docs page. */
export function CurvesMarkersAndShapesExample() {
	return (
		<PreviewCanvas>
			<CurveMarkersExample />
		</PreviewCanvas>
	);
}

/** The "High-density series" example on the Line Chart docs page. */
export function HighDensitySeriesExample() {
	return (
		<PreviewCanvas>
			<HighDensityExample />
		</PreviewCanvas>
	);
}

/** The "Gaps and connectNulls" example on the Line Chart docs page. */
export function GapsAndConnectnullsExample() {
	return (
		<PreviewCanvas>
			<GapsExample />
		</PreviewCanvas>
	);
}

export const parameterTail = [
	{ value: 1, llama: 48_000, mistral: 61_000 },
	{ value: 2, llama: 2_100, mistral: 5_400 },
	{ value: 4, llama: 130, mistral: 610 },
	{ value: 8, llama: 9, mistral: 74 },
	{ value: 16, llama: 0, mistral: 6 },
	{ value: 32, llama: 0, mistral: 1 },
];

export function LogScaleLineChartExample() {
	return (
		<LineChart.Root
			data={parameterTail}
			xKey="value"
			aria-label="Parameters by magnitude, log scale"
		>
			<LineChart.Grid />
			<LineChart.XAxis />
			<LineChart.YAxis scale={logScale} />
			<LineChart.Line dataKey="llama" label="Llama" color="blue" markers />
			<LineChart.Line dataKey="mistral" label="Mistral" color="emerald" markers />
			<LineChart.Legend />
			<LineChart.Tooltip />
		</LineChart.Root>
	);
}

/** The "Log scale" example on the Line Chart docs page. */
export function LogScaleExample() {
	return (
		<PreviewCanvas>
			<LogScaleLineChartExample />
		</PreviewCanvas>
	);
}

/** The "Reference lines" example on the Line Chart docs page. */
export function ReferenceLinesExample() {
	return (
		<PreviewCanvas>
			<ReferenceLineExample />
		</PreviewCanvas>
	);
}

/** The "Axis titles" example on the Line Chart docs page. */
export function AxisTitlesExample() {
	return (
		<PreviewCanvas>
			<AxisTitlesLineChartExample />
		</PreviewCanvas>
	);
}

/** The "Linked charts" example on the Line Chart docs page. */
/** The "Two y axes" example on the Line Chart docs page. */
export function TwoYAxesExample() {
	return (
		<PreviewCanvas>
			<TwoYAxesLineChartExample />
		</PreviewCanvas>
	);
}

export function LinkedChartsExample() {
	return (
		<PreviewCanvas>
			<LinkedChartsDemo />
		</PreviewCanvas>
	);
}

/** The "Live data" example on the Line Chart docs page. */
export function LiveDataExample() {
	return (
		<PreviewCanvas>
			<LiveLineExample />
		</PreviewCanvas>
	);
}

/** The "Copy as markdown" example on the Line Chart docs page. */
export function CopyAsMarkdownExample() {
	return (
		<PreviewCanvas>
			<CopyMarkdownExample />
		</PreviewCanvas>
	);
}

/** The "Decorative charts" example on the Line Chart docs page. */
export function DecorativeChartsExample() {
	return (
		<PreviewCanvas>
			<EmptyStateLineChartExample />
		</PreviewCanvas>
	);
}

/** The "Restyle a color for one chart" example on the Line Chart docs page. */
export function RestyleAColorForOneChartExample() {
	return (
		<PreviewCanvas>
			<SeriesIdentityLineChartExample />
		</PreviewCanvas>
	);
}
