import { Button } from "@ngrok/mantle/button";
import { Empty } from "@ngrok/mantle/empty";
import { ScatterPlot } from "@ngrok/mantle/scatter-plot";
import { useState } from "react";

import { PreviewCanvas } from "~/components/preview-canvas";

export function createSeededRandom(seed: number) {
	// Deterministic LCG (Numerical Recipes constants) — the docs render
	// identically on every load, no Math.random.
	let state = seed >>> 0;
	return () => {
		state = (state * 1664525 + 1013904223) >>> 0;
		return state / 4294967296;
	};
}

export function regionPoints({
	key,
	seed,
	latencyBase,
}: {
	key: string;
	seed: number;
	latencyBase: number;
}) {
	const random = createSeededRandom(seed);
	return Array.from({ length: 40 }, () => {
		const latency = Math.round(latencyBase + (random() + random()) * 45);
		const throughput = Math.round(1180 - latency * 6 + (random() - 0.5) * 160);
		return { latency, [key]: throughput };
	});
}

export const regionThroughput = [
	...regionPoints({ key: "usEast", seed: 11, latencyBase: 18 }),
	...regionPoints({ key: "euWest", seed: 47, latencyBase: 62 }),
];

export function RegionScatterExample() {
	return (
		<ScatterPlot.Root
			data={regionThroughput}
			xKey="latency"
			aria-label="Latency vs throughput by region"
		>
			<ScatterPlot.Grid />
			<ScatterPlot.XAxis tickFormat={(value) => `${String(value)}ms`} />
			<ScatterPlot.YAxis />
			<ScatterPlot.Point dataKey="usEast" label="US East" color="blue" />
			<ScatterPlot.Point dataKey="euWest" label="EU West" color="emerald" />
			<ScatterPlot.Tooltip valueFormat={(value) => `${value} rps`} />
			<ScatterPlot.Legend />
		</ScatterPlot.Root>
	);
}

export const shapedRegions = [
	...regionPoints({ key: "usEast", seed: 11, latencyBase: 18 }),
	...regionPoints({ key: "euWest", seed: 47, latencyBase: 62 }),
	...regionPoints({ key: "apSouth", seed: 83, latencyBase: 104 }),
];

export function PointShapesDemo() {
	return (
		<ScatterPlot.Root
			data={shapedRegions}
			xKey="latency"
			aria-label="Latency vs throughput by region, shape-coded"
		>
			<ScatterPlot.Grid />
			<ScatterPlot.XAxis tickFormat={(value) => `${String(value)}ms`} />
			<ScatterPlot.YAxis />
			<ScatterPlot.Point dataKey="usEast" label="US East" color="blue" />
			<ScatterPlot.Point dataKey="euWest" label="EU West" shape="square" color="emerald" />
			<ScatterPlot.Point dataKey="apSouth" label="AP South" shape="star" color="pink" />
			<ScatterPlot.Tooltip valueFormat={(value) => `${value} rps`} />
			<ScatterPlot.Legend />
		</ScatterPlot.Root>
	);
}

export function CopyMarkdownExample() {
	return (
		<ScatterPlot.Root
			data={regionThroughput}
			xKey="latency"
			aria-label="Latency vs throughput by region, copyable"
		>
			<ScatterPlot.Grid />
			<ScatterPlot.XAxis tickFormat={(value) => `${String(value)}ms`} />
			<ScatterPlot.YAxis />
			<ScatterPlot.Point dataKey="usEast" label="US East" color="blue" />
			<ScatterPlot.Point dataKey="euWest" label="EU West" color="emerald" />
			<ScatterPlot.Tooltip valueFormat={(value) => `${value} rps`} />
			<ScatterPlot.Legend />
			<ScatterPlot.CopyButton className="absolute right-0 top-0" />
		</ScatterPlot.Root>
	);
}

export function seededRequests(count: number, seed: number) {
	const random = createSeededRandom(seed);
	return Array.from({ length: count }, () => {
		const size = Math.round(2 + random() * random() * 510);
		const duration = Math.max(2, Math.round(6 + size * 0.55 + (random() + random() - 1) * 90));
		return { size, duration };
	});
}

export const requestDurations = seededRequests(8_000, 20_260_719);

export function DenseScatterDemo() {
	return (
		<ScatterPlot.Root
			data={requestDurations}
			xKey="size"
			aria-label="Response duration by payload size, 8,000 requests"
		>
			<ScatterPlot.Grid />
			<ScatterPlot.XAxis tickFormat={(value) => `${String(value)}KB`} />
			<ScatterPlot.YAxis tickFormat={(value) => `${String(value)}ms`} />
			<ScatterPlot.Point dataKey="duration" label="Duration" color="blue" />
			<ScatterPlot.Tooltip valueFormat={(value) => `${String(value)}ms`} />
		</ScatterPlot.Root>
	);
}

type ClusterAxes = { cpu: number; memory: number; connections: number };

export function seededCluster({
	key,
	seed,
	center,
	spread,
}: {
	key: string;
	seed: number;
	center: ClusterAxes;
	spread: ClusterAxes;
}) {
	const random = createSeededRandom(seed);
	const jitter = () => random() + random() - 1;
	return Array.from({ length: 32 }, () => ({
		cpu: Math.round(center.cpu + jitter() * spread.cpu),
		[key]: Math.round(center.memory + jitter() * spread.memory),
		connections: Math.round(center.connections + jitter() * spread.connections),
	}));
}

export const gatewayNodes = [
	...seededCluster({
		key: "usEast",
		seed: 3,
		center: { cpu: 34, memory: 46, connections: 420 },
		spread: { cpu: 14, memory: 12, connections: 110 },
	}),
	...seededCluster({
		key: "euWest",
		seed: 17,
		center: { cpu: 64, memory: 72, connections: 660 },
		spread: { cpu: 12, memory: 10, connections: 90 },
	}),
	...seededCluster({
		key: "apSoutheast",
		seed: 29,
		center: { cpu: 80, memory: 34, connections: 240 },
		spread: { cpu: 9, memory: 12, connections: 80 },
	}),
];

export function Scatter3dDemo() {
	return (
		<ScatterPlot.Root
			data={gatewayNodes}
			xKey="cpu"
			zKey="connections"
			aria-label="Gateway nodes by CPU, memory, and connections"
		>
			<ScatterPlot.Point dataKey="usEast" label="US East" color="blue" />
			<ScatterPlot.Point dataKey="euWest" label="EU West" shape="square" color="emerald" />
			<ScatterPlot.Point dataKey="apSoutheast" label="AP Southeast" shape="triangle" color="pink" />
			<ScatterPlot.Tooltip />
			<ScatterPlot.Legend />
		</ScatterPlot.Root>
	);
}

export const coldStarts = [
	{ bundleSize: 4.1, startupTime: 148 },
	{ bundleSize: 5.6, startupTime: 172 },
	{ bundleSize: 7.4, startupTime: 205 },
	{ bundleSize: 9.8, startupTime: 288 },
	{ bundleSize: 11.2, startupTime: 254 },
	{ bundleSize: 12.9, startupTime: 341 },
	{ bundleSize: 14.4, startupTime: 312 },
	{ bundleSize: 16.2, startupTime: 398 },
	{ bundleSize: 17.3, startupTime: 288 },
	{ bundleSize: 19.1, startupTime: 452 },
	{ bundleSize: 21.5, startupTime: 384 },
	{ bundleSize: 24.0, startupTime: 507 },
];

export const dimensionClusters = [
	...seededCluster({
		key: "clusterA",
		seed: 5,
		center: { cpu: 40, memory: 25, connections: 75 },
		spread: { cpu: 12, memory: 8, connections: 9 },
	}),
	...seededCluster({
		key: "clusterB",
		seed: 23,
		center: { cpu: 45, memory: 75, connections: 25 },
		spread: { cpu: 12, memory: 8, connections: 9 },
	}),
	...seededCluster({
		key: "clusterC",
		seed: 41,
		center: { cpu: 55, memory: 30, connections: 30 },
		spread: { cpu: 12, memory: 8, connections: 9 },
	}),
	...seededCluster({
		key: "clusterD",
		seed: 59,
		center: { cpu: 60, memory: 70, connections: 80 },
		spread: { cpu: 12, memory: 8, connections: 9 },
	}),
];

export function DimensionsDemo() {
	const [dimensions, setDimensions] = useState<1 | 2 | 3>(1);
	return (
		<div className="flex w-full flex-col gap-3">
			<div className="flex items-center justify-between">
				<div className="flex gap-1">
					{([1, 2, 3] as const).map((option) => (
						<Button
							key={option}
							type="button"
							appearance={dimensions === option ? "filled" : "outlined"}
							intent="neutral"
							onClick={() => setDimensions(option)}
						>
							{option}D
						</Button>
					))}
				</div>
				<span className="text-muted text-xs">Drag to rotate</span>
			</div>
			<ScatterPlot.Root
				data={dimensionClusters}
				xKey="cpu"
				zKey="connections"
				dimensions={dimensions}
				aria-label="Four clusters separating across one, two, and three dimensions"
			>
				<ScatterPlot.Point dataKey="clusterA" label="Cluster A" color="blue" />
				<ScatterPlot.Point dataKey="clusterB" label="Cluster B" shape="square" color="emerald" />
				<ScatterPlot.Point dataKey="clusterC" label="Cluster C" shape="triangle" color="pink" />
				<ScatterPlot.Point dataKey="clusterD" label="Cluster D" shape="diamond" color="orange" />
				<ScatterPlot.Tooltip />
				<ScatterPlot.Legend />
			</ScatterPlot.Root>
		</div>
	);
}

export function ReferenceLineScatterExample() {
	return (
		<ScatterPlot.Root
			data={coldStarts}
			xKey="bundleSize"
			aria-label="Cold start time by bundle size"
		>
			<ScatterPlot.Grid />
			<ScatterPlot.XAxis tickFormat={(value) => `${String(value)}MB`} />
			<ScatterPlot.YAxis tickFormat={(value) => `${String(value)}ms`} />
			<ScatterPlot.Point dataKey="startupTime" label="Cold start" color="blue" />
			<ScatterPlot.ReferenceLine y={300} label="Target" />
			<ScatterPlot.Tooltip valueFormat={(value) => `${String(value)}ms`} />
		</ScatterPlot.Root>
	);
}

export const placeholderCloud = [
	[12, 840],
	[20, 610],
	[28, 720],
	[34, 480],
	[41, 560],
	[47, 390],
	[55, 470],
	[62, 300],
].map(([latency, throughput]) => ({ latency, throughput }));

export function EmptyStateScatterPlotExample() {
	return (
		<div className="relative w-full">
			<ScatterPlot.Root data={placeholderCloud} xKey="latency" mode="decorative">
				<ScatterPlot.Point dataKey="throughput" color="blue" />
			</ScatterPlot.Root>
			<Empty.Root className="absolute inset-0 m-auto h-fit w-fit">
				<Empty.Title>No data to correlate yet</Empty.Title>
				<Empty.Description>
					<p>Points will appear here once your endpoints report latency and throughput.</p>
				</Empty.Description>
			</Empty.Root>
		</div>
	);
}

export function SeriesIdentityScatterPlotExample() {
	return (
		<ScatterPlot.Root
			data={regionThroughput}
			xKey="latency"
			// An app declares its brand token once, high in the tree. This example
			// declares it beside the override so it stands alone. A theme that needs
			// its own value takes a variant: `dark:[--color-brand:…]`.
			className="[--color-brand:#d07c00] [--color-chart-blue:var(--color-brand)]"
			aria-label="Latency vs throughput by region, blue rethemed"
		>
			<ScatterPlot.Grid />
			<ScatterPlot.XAxis tickFormat={(value) => `${String(value)}ms`} />
			<ScatterPlot.YAxis />
			<ScatterPlot.Point dataKey="usEast" label="US East" color="blue" />
			<ScatterPlot.Point dataKey="euWest" label="EU West" color="var(--color-accent-600)" />
			<ScatterPlot.Tooltip valueFormat={(value) => `${value} rps`} />
			<ScatterPlot.Legend />
		</ScatterPlot.Root>
	);
}

/** The first example on the Scatter Plot docs page. */
export function OverviewExample() {
	return (
		<PreviewCanvas>
			<RegionScatterExample />
		</PreviewCanvas>
	);
}

/** The "Point shapes" example on the Scatter Plot docs page. */
export function PointShapesExample() {
	return (
		<PreviewCanvas>
			<PointShapesDemo />
		</PreviewCanvas>
	);
}

/** The "Dense scatter" example on the Scatter Plot docs page. */
export function DenseScatterExample() {
	return (
		<PreviewCanvas>
			<DenseScatterDemo />
		</PreviewCanvas>
	);
}

/** The "3D scatter" example on the Scatter Plot docs page. */
export function Scatter3dExample() {
	return (
		<PreviewCanvas>
			<Scatter3dDemo />
		</PreviewCanvas>
	);
}

/** The "Dimensions" example on the Scatter Plot docs page. */
export function DimensionsExample() {
	return (
		<PreviewCanvas>
			<DimensionsDemo />
		</PreviewCanvas>
	);
}

/** The "Reference lines" example on the Scatter Plot docs page. */
export function ReferenceLinesExample() {
	return (
		<PreviewCanvas>
			<ReferenceLineScatterExample />
		</PreviewCanvas>
	);
}

/** The "Copy as markdown" example on the Scatter Plot docs page. */
export function CopyAsMarkdownExample() {
	return (
		<PreviewCanvas>
			<CopyMarkdownExample />
		</PreviewCanvas>
	);
}

/** The "Decorative charts" example on the Scatter Plot docs page. */
export function DecorativeChartsExample() {
	return (
		<PreviewCanvas>
			<EmptyStateScatterPlotExample />
		</PreviewCanvas>
	);
}

/** The "Series color" example on the Scatter Plot docs page. */
export function SeriesColorExample() {
	return (
		<PreviewCanvas>
			<SeriesIdentityScatterPlotExample />
		</PreviewCanvas>
	);
}
