import { AreaChart } from "@ngrok/mantle";

const trafficData = [
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

const regionData = [
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

const bandwidthStart = new Date("2026-07-14T12:00:00Z").getTime();
const bandwidthData = Array.from({ length: 60 }, (_, minute) => ({
	time: new Date(bandwidthStart + minute * 60_000),
	mbps: Math.round(240 + 60 * Math.sin(minute / 9) + 18 * Math.sin(minute / 2.2) + minute),
}));

export const StackedByProtocol = () => (
	<AreaChart.Root
		data={trafficData}
		xKey="date"
		stacked
		aria-label="Connections by protocol"
		className="h-64"
	>
		<AreaChart.Grid />
		<AreaChart.XAxis />
		<AreaChart.YAxis tickFormat={(value: number) => `${value / 1000}k`} />
		<AreaChart.Area dataKey="http" label="HTTP" />
		<AreaChart.Area dataKey="tcp" label="TCP" />
		<AreaChart.Area dataKey="tls" label="TLS" />
		<AreaChart.Tooltip />
		<AreaChart.Legend />
	</AreaChart.Root>
);

export const OverlappingRegions = () => (
	<AreaChart.Root data={regionData} xKey="date" aria-label="Requests by region" className="h-64">
		<AreaChart.Grid />
		<AreaChart.XAxis />
		<AreaChart.YAxis />
		<AreaChart.Area dataKey="usEast" label="US East" />
		<AreaChart.Area dataKey="euWest" label="EU West" />
		<AreaChart.Tooltip />
		<AreaChart.Legend />
	</AreaChart.Root>
);

export const BandwidthMonotone = () => (
	<AreaChart.Root
		data={bandwidthData}
		xKey="time"
		aria-label="Tunnel bandwidth per minute"
		className="h-64"
	>
		<AreaChart.Grid />
		<AreaChart.XAxis />
		<AreaChart.YAxis tickFormat={(value: number) => `${value} Mbps`} />
		<AreaChart.Area dataKey="mbps" label="Bandwidth" curve="monotone" />
		<AreaChart.Tooltip valueFormat={(value: number) => `${value} Mbps`} />
	</AreaChart.Root>
);

export const CapacityReferenceLine = () => (
	<AreaChart.Root
		data={trafficData}
		xKey="date"
		stacked
		aria-label="Connections by protocol against provisioned capacity"
		className="h-64"
	>
		<AreaChart.Grid />
		<AreaChart.XAxis />
		<AreaChart.YAxis tickFormat={(value: number) => `${value / 1000}k`} />
		<AreaChart.Area dataKey="http" label="HTTP" />
		<AreaChart.Area dataKey="tcp" label="TCP" />
		<AreaChart.Area dataKey="tls" label="TLS" />
		<AreaChart.ReferenceLine y={9000} label="Capacity" />
		<AreaChart.Tooltip />
		<AreaChart.Legend />
	</AreaChart.Root>
);
