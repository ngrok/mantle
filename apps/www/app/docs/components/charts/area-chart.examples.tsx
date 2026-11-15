import { AreaChart } from "@ngrok/mantle/area-chart";
import { Empty } from "@ngrok/mantle/empty";
import { useEffect, useState } from "react";

import { PreviewCanvas } from "~/components/preview-canvas";

export const trafficData = [
	{ date: new Date("2026-07-01"), http: 4200, tcp: 1400, tls: 860 },
	{ date: new Date("2026-07-02"), http: 4600, tcp: 1350, tls: 900 },
	{ date: new Date("2026-07-03"), http: 5100, tcp: 1500, tls: 940 },
	{ date: new Date("2026-07-04"), http: 3800, tcp: 1250, tls: 780 },
	{ date: new Date("2026-07-05"), http: 3500, tcp: 1200, tls: 750 },
	{ date: new Date("2026-07-06"), http: 4900, tcp: 1550, tls: 980 },
	{ date: new Date("2026-07-07"), http: 5400, tcp: 1600, tls: 1050 },
	{ date: new Date("2026-07-08"), http: 5800, tcp: 1700, tls: 1100 },
	{ date: new Date("2026-07-09"), http: 5200, tcp: 1650, tls: 1020 },
	{ date: new Date("2026-07-10"), http: 6100, tcp: 1800, tls: 1150 },
	{ date: new Date("2026-07-11"), http: 4400, tcp: 1450, tls: 880 },
	{ date: new Date("2026-07-12"), http: 4100, tcp: 1400, tls: 840 },
	{ date: new Date("2026-07-13"), http: 5600, tcp: 1750, tls: 1080 },
	{ date: new Date("2026-07-14"), http: 6300, tcp: 1900, tls: 1200 },
];

export function SingleSeriesAreaExample() {
	return (
		<AreaChart.Root
			data={trafficData}
			xKey="date"
			aria-label="HTTP connections per day"
			className="max-w-2xl"
		>
			<AreaChart.Grid />
			<AreaChart.XAxis />
			<AreaChart.YAxis tickFormat={(value) => `${value / 1000}k`} />
			<AreaChart.Area dataKey="http" label="HTTP" color="blue" />
			<AreaChart.Tooltip />
		</AreaChart.Root>
	);
}

export function StackedAreaExample() {
	return (
		<AreaChart.Root
			data={trafficData}
			xKey="date"
			stacked
			aria-label="Connections by protocol"
			className="max-w-2xl"
		>
			<AreaChart.Grid />
			<AreaChart.XAxis />
			<AreaChart.YAxis tickFormat={(value) => `${value / 1000}k`} />
			<AreaChart.Area dataKey="http" label="HTTP" color="blue" />
			<AreaChart.Area dataKey="tcp" label="TCP" color="emerald" />
			<AreaChart.Area dataKey="tls" label="TLS" color="pink" />
			<AreaChart.Tooltip />
			<AreaChart.Legend />
		</AreaChart.Root>
	);
}

export const noTrafficYet = [
	{ date: new Date("2026-07-08"), requests: 0 },
	{ date: new Date("2026-07-09"), requests: 0 },
	{ date: new Date("2026-07-10"), requests: 0 },
	{ date: new Date("2026-07-11"), requests: 0 },
	{ date: new Date("2026-07-12"), requests: 0 },
	{ date: new Date("2026-07-13"), requests: 0 },
	{ date: new Date("2026-07-14"), requests: 0 },
];

export function NoTrafficYetAreaChartExample() {
	return (
		<AreaChart.Root data={noTrafficYet} xKey="date" aria-label="Requests per day">
			<AreaChart.Grid />
			<AreaChart.XAxis />
			<AreaChart.YAxis />
			<AreaChart.Area dataKey="requests" label="Requests" color="blue" />
			<AreaChart.Tooltip />
		</AreaChart.Root>
	);
}

export const regionData = [
	{ date: new Date("2026-07-01"), usEast: 2400, euWest: 1900 },
	{ date: new Date("2026-07-02"), usEast: 2600, euWest: 2100 },
	{ date: new Date("2026-07-03"), usEast: 2500, euWest: 2350 },
	{ date: new Date("2026-07-04"), usEast: 2100, euWest: 2500 },
	{ date: new Date("2026-07-05"), usEast: 1950, euWest: 2650 },
	{ date: new Date("2026-07-06"), usEast: 2300, euWest: 2600 },
	{ date: new Date("2026-07-07"), usEast: 2700, euWest: 2450 },
	{ date: new Date("2026-07-08"), usEast: 2900, euWest: 2300 },
	{ date: new Date("2026-07-09"), usEast: 2800, euWest: 2500 },
	{ date: new Date("2026-07-10"), usEast: 3000, euWest: 2700 },
	{ date: new Date("2026-07-11"), usEast: 2600, euWest: 2850 },
	{ date: new Date("2026-07-12"), usEast: 2450, euWest: 2900 },
	{ date: new Date("2026-07-13"), usEast: 2750, euWest: 2700 },
	{ date: new Date("2026-07-14"), usEast: 3100, euWest: 2550 },
];

export function OverlappingAreasDemo() {
	return (
		<AreaChart.Root
			data={regionData}
			xKey="date"
			aria-label="Requests by region"
			className="max-w-2xl"
		>
			<AreaChart.Grid />
			<AreaChart.XAxis />
			<AreaChart.YAxis />
			<AreaChart.Area dataKey="usEast" label="US East" color="blue" />
			<AreaChart.Area dataKey="euWest" label="EU West" color="emerald" />
			<AreaChart.Tooltip />
			<AreaChart.Legend />
		</AreaChart.Root>
	);
}

export const shapedRegionData = [
	{ date: new Date("2026-07-01"), usEast: 2400, euWest: 1900, apSouth: 1150 },
	{ date: new Date("2026-07-02"), usEast: 2600, euWest: 2100, apSouth: 1300 },
	{ date: new Date("2026-07-03"), usEast: 2500, euWest: 2350, apSouth: 1250 },
	{ date: new Date("2026-07-04"), usEast: 2100, euWest: 2500, apSouth: 1400 },
	{ date: new Date("2026-07-05"), usEast: 1950, euWest: 2650, apSouth: 1500 },
	{ date: new Date("2026-07-06"), usEast: 2300, euWest: 2600, apSouth: 1450 },
	{ date: new Date("2026-07-07"), usEast: 2700, euWest: 2450, apSouth: 1350 },
	{ date: new Date("2026-07-08"), usEast: 2900, euWest: 2300, apSouth: 1500 },
	{ date: new Date("2026-07-09"), usEast: 2800, euWest: 2500, apSouth: 1600 },
	{ date: new Date("2026-07-10"), usEast: 3000, euWest: 2700, apSouth: 1550 },
	{ date: new Date("2026-07-11"), usEast: 2600, euWest: 2850, apSouth: 1650 },
	{ date: new Date("2026-07-12"), usEast: 2450, euWest: 2900, apSouth: 1600 },
	{ date: new Date("2026-07-13"), usEast: 2750, euWest: 2700, apSouth: 1500 },
	{ date: new Date("2026-07-14"), usEast: 3100, euWest: 2550, apSouth: 1700 },
];

export function ShapesDemo() {
	const [activeIndex, setActiveIndex] = useState(9);
	return (
		<AreaChart.Root
			data={shapedRegionData}
			xKey="date"
			stacked
			activeIndex={activeIndex}
			onActiveIndexChange={(index) => setActiveIndex(index ?? 9)}
			aria-label="Requests by region, shape-coded"
			className="max-w-2xl"
		>
			<AreaChart.Grid />
			<AreaChart.XAxis />
			<AreaChart.YAxis />
			<AreaChart.Area dataKey="usEast" label="US East" color="blue" />
			<AreaChart.Area dataKey="euWest" label="EU West" color="emerald" shape="square" />
			<AreaChart.Area dataKey="apSouth" label="AP South" color="pink" shape="star" />
			<AreaChart.Tooltip />
			<AreaChart.Legend />
		</AreaChart.Root>
	);
}

export function CopyMarkdownExample() {
	return (
		<AreaChart.Root
			data={trafficData}
			xKey="date"
			stacked
			aria-label="Traffic by protocol, copyable"
		>
			<AreaChart.Grid />
			<AreaChart.XAxis />
			<AreaChart.YAxis />
			<AreaChart.Area dataKey="http" label="HTTP" color="blue" />
			<AreaChart.Area dataKey="tcp" label="TCP" color="emerald" />
			<AreaChart.Area dataKey="tls" label="TLS" color="pink" />
			<AreaChart.Tooltip />
			<AreaChart.Legend />
			<AreaChart.CopyButton className="absolute right-0 top-0" />
		</AreaChart.Root>
	);
}

export const sessionData = [
	{ date: new Date("2026-07-08"), sessions: 320 },
	{ date: new Date("2026-07-09"), sessions: 180 },
	{ date: new Date("2026-07-10"), sessions: 540 },
	{ date: new Date("2026-07-11"), sessions: 260 },
	{ date: new Date("2026-07-12"), sessions: 210 },
	{ date: new Date("2026-07-13"), sessions: 480 },
	{ date: new Date("2026-07-14"), sessions: 380 },
];

export function CurveExample() {
	return (
		<div className="grid w-full gap-6 sm:grid-cols-2">
			<div className="flex flex-col gap-2">
				<p id="area-curve-linear" className="text-muted font-mono text-xs">
					curve=&quot;linear&quot; (default)
				</p>
				<AreaChart.Root data={sessionData} xKey="date" aria-labelledby="area-curve-linear">
					<AreaChart.Grid />
					<AreaChart.XAxis />
					<AreaChart.YAxis />
					<AreaChart.Area dataKey="sessions" label="Sessions" color="blue" />
					<AreaChart.Tooltip />
				</AreaChart.Root>
			</div>
			<div className="flex flex-col gap-2">
				<p id="area-curve-monotone" className="text-muted font-mono text-xs">
					curve=&quot;monotone&quot;
				</p>
				<AreaChart.Root data={sessionData} xKey="date" aria-labelledby="area-curve-monotone">
					<AreaChart.Grid />
					<AreaChart.XAxis />
					<AreaChart.YAxis />
					<AreaChart.Area dataKey="sessions" label="Sessions" curve="monotone" color="blue" />
					<AreaChart.Tooltip />
				</AreaChart.Root>
			</div>
		</div>
	);
}

export const outageData = [
	{ date: new Date("2026-07-05"), requests: 1200 },
	{ date: new Date("2026-07-06"), requests: 1350 },
	{ date: new Date("2026-07-07"), requests: 1500 },
	{ date: new Date("2026-07-08"), requests: null },
	{ date: new Date("2026-07-09"), requests: null },
	{ date: new Date("2026-07-10"), requests: 1420 },
	{ date: new Date("2026-07-11"), requests: 1600 },
	{ date: new Date("2026-07-12"), requests: 1680 },
	{ date: new Date("2026-07-13"), requests: 1540 },
	{ date: new Date("2026-07-14"), requests: 1750 },
];

export function GapsExample() {
	return (
		<div className="grid w-full gap-6 sm:grid-cols-2">
			<div className="flex flex-col gap-2">
				<p id="area-gaps-default" className="text-muted font-mono text-xs">
					gaps (default)
				</p>
				<AreaChart.Root data={outageData} xKey="date" aria-labelledby="area-gaps-default">
					<AreaChart.Grid />
					<AreaChart.XAxis />
					<AreaChart.YAxis />
					<AreaChart.Area dataKey="requests" label="Requests" color="blue" />
					<AreaChart.Tooltip />
				</AreaChart.Root>
			</div>
			<div className="flex flex-col gap-2">
				<p id="area-gaps-connect" className="text-muted font-mono text-xs">
					connectNulls
				</p>
				<AreaChart.Root data={outageData} xKey="date" aria-labelledby="area-gaps-connect">
					<AreaChart.Grid />
					<AreaChart.XAxis />
					<AreaChart.YAxis />
					<AreaChart.Area dataKey="requests" label="Requests" connectNulls color="blue" />
					<AreaChart.Tooltip />
				</AreaChart.Root>
			</div>
		</div>
	);
}

export function ReferenceLineExample() {
	return (
		<AreaChart.Root
			data={trafficData}
			xKey="date"
			stacked
			aria-label="Connections by protocol against provisioned capacity"
			className="max-w-2xl"
		>
			<AreaChart.Grid />
			<AreaChart.XAxis />
			<AreaChart.YAxis tickFormat={(value) => `${value / 1000}k`} />
			<AreaChart.Area dataKey="http" label="HTTP" color="blue" />
			<AreaChart.Area dataKey="tcp" label="TCP" color="emerald" />
			<AreaChart.Area dataKey="tls" label="TLS" color="pink" />
			<AreaChart.ReferenceLine y={9000} label="Capacity" />
			<AreaChart.Tooltip />
			<AreaChart.Legend />
		</AreaChart.Root>
	);
}

export const streamEpoch = new Date("2026-07-14T12:00:00Z").getTime();

export const formatClock = new Intl.DateTimeFormat("en-US", {
	hour: "2-digit",
	minute: "2-digit",
	second: "2-digit",
	hour12: false,
	timeZone: "UTC",
});

export function streamPoint(tick: number) {
	const drift = 400 * Math.sin(tick / 240);
	const swell = 600 * Math.sin(tick / 9);
	const chop = 180 * Math.sin(tick / 2.2);
	return {
		time: new Date(streamEpoch + tick * 200),
		throughput: Math.round(2400 + drift + swell + chop),
	};
}

export function LiveAreaExample() {
	const [tick, setTick] = useState(0);
	useEffect(() => {
		const interval = setInterval(() => {
			setTick((current) => current + 1);
		}, 200);
		return () => clearInterval(interval);
	}, []);
	const data = Array.from({ length: 60 }, (_, index) => streamPoint(tick + index));
	return (
		<AreaChart.Root
			data={data}
			xKey="time"
			aria-label="Live tunnel throughput"
			className="max-w-2xl"
		>
			<AreaChart.Grid />
			<AreaChart.XAxis
				tickFormat={(value) => (value instanceof Date ? formatClock.format(value) : String(value))}
			/>
			<AreaChart.YAxis />
			<AreaChart.Area dataKey="throughput" label="Throughput" curve="monotone" color="blue" />
			<AreaChart.Tooltip
				labelFormat={(value) => (value instanceof Date ? formatClock.format(value) : String(value))}
			/>
		</AreaChart.Root>
	);
}

export const placeholderTraffic = [30, 48, 40, 62, 55, 74, 66, 80].map((value, index) => ({
	minute: index,
	value,
}));

export function EmptyStateAreaChartExample() {
	return (
		<div className="relative w-full">
			<AreaChart.Root data={placeholderTraffic} xKey="minute" mode="decorative">
				<AreaChart.Area dataKey="value" curve="monotone" color="blue" />
			</AreaChart.Root>
			<Empty.Root className="absolute inset-0 m-auto h-fit w-fit">
				<Empty.Title>No traffic yet</Empty.Title>
				<Empty.Description>
					<p>Throughput will appear here once your endpoints start serving traffic.</p>
				</Empty.Description>
			</Empty.Root>
		</div>
	);
}

export function SeriesIdentityAreaChartExample() {
	return (
		<AreaChart.Root
			data={trafficData}
			xKey="date"
			stacked
			// An app declares its brand token once, high in the tree. This example
			// declares it beside the override so it stands alone. A theme that needs
			// its own value takes a variant: `dark:[--color-brand:…]`.
			className="max-w-2xl [--color-brand:#d07c00] [--color-chart-blue:var(--color-brand)]"
			aria-label="Connections by protocol, HTTP in the brand color"
		>
			<AreaChart.Grid />
			<AreaChart.XAxis />
			<AreaChart.YAxis tickFormat={(value) => `${value / 1000}k`} />
			<AreaChart.Area dataKey="http" label="HTTP" color="blue" />
			<AreaChart.Area dataKey="tcp" label="TCP" color="emerald" />
			<AreaChart.Area dataKey="tls" label="TLS" color="var(--color-accent-600)" />
			<AreaChart.Tooltip />
			<AreaChart.Legend />
		</AreaChart.Root>
	);
}

/** The first example on the Area Chart docs page. */
export function OverviewExample() {
	return (
		<PreviewCanvas>
			<SingleSeriesAreaExample />
		</PreviewCanvas>
	);
}

/** The "Stacked areas" example on the Area Chart docs page. */
export function StackedAreasExample() {
	return (
		<PreviewCanvas>
			<StackedAreaExample />
		</PreviewCanvas>
	);
}

/** The "Overlapping areas" example on the Area Chart docs page. */
export function OverlappingAreasExample() {
	return (
		<PreviewCanvas>
			<OverlappingAreasDemo />
		</PreviewCanvas>
	);
}

/** The "Shapes" example on the Area Chart docs page. */
export function ShapesExample() {
	return (
		<PreviewCanvas>
			<ShapesDemo />
		</PreviewCanvas>
	);
}

/** The "Curve interpolation" example on the Area Chart docs page. */
export function CurveInterpolationExample() {
	return (
		<PreviewCanvas>
			<CurveExample />
		</PreviewCanvas>
	);
}

/** The "Gaps in the data" example on the Area Chart docs page. */
export function GapsInTheDataExample() {
	return (
		<PreviewCanvas>
			<GapsExample />
		</PreviewCanvas>
	);
}

/** The "No traffic yet" example on the Area Chart docs page. */
export function NoTrafficYetExample() {
	return (
		<PreviewCanvas>
			<NoTrafficYetAreaChartExample />
		</PreviewCanvas>
	);
}

/** The "Reference lines" example on the Area Chart docs page. */
export function ReferenceLinesExample() {
	return (
		<PreviewCanvas>
			<ReferenceLineExample />
		</PreviewCanvas>
	);
}

/** The "Live data" example on the Area Chart docs page. */
export function LiveDataExample() {
	return (
		<PreviewCanvas>
			<LiveAreaExample />
		</PreviewCanvas>
	);
}

/** The "Copy as markdown" example on the Area Chart docs page. */
export function CopyAsMarkdownExample() {
	return (
		<PreviewCanvas>
			<CopyMarkdownExample />
		</PreviewCanvas>
	);
}

/** The "Decorative charts" example on the Area Chart docs page. */
export function DecorativeChartsExample() {
	return (
		<PreviewCanvas>
			<EmptyStateAreaChartExample />
		</PreviewCanvas>
	);
}

/** The "Series identity and color" example on the Area Chart docs page. */
export function SeriesIdentityAndColorExample() {
	return (
		<PreviewCanvas>
			<SeriesIdentityAreaChartExample />
		</PreviewCanvas>
	);
}
