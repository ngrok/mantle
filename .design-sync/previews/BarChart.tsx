import { BarChart } from "@ngrok/mantle";

const requestsByRegion = [
	{ month: "January", usEast: 186_000, euWest: 120_000 },
	{ month: "February", usEast: 205_000, euWest: 142_000 },
	{ month: "March", usEast: 237_000, euWest: 151_000 },
	{ month: "April", usEast: 173_000, euWest: 190_000 },
	{ month: "May", usEast: 209_000, euWest: 168_000 },
	{ month: "June", usEast: 254_000, euWest: 176_000 },
];

const endpointRequests = [
	{ endpoint: "/api/tunnels", requests: 4820 },
	{ endpoint: "/api/edges", requests: 3190 },
	{ endpoint: "/api/domains", requests: 2440 },
	{ endpoint: "/api/certs", requests: 1210 },
	{ endpoint: "/api/events", requests: 640 },
];

const monthlySpend = [
	{ month: "January", endpoints: 39, transfer: 11.42, events: 2.28 },
	{ month: "February", endpoints: 39, transfer: 12.06, events: 2.31 },
	{ month: "March", endpoints: 39, transfer: 9.87, events: 1.9 },
	{ month: "April", endpoints: 39, transfer: 14.55, events: 2.19 },
	{ month: "May", endpoints: 39, transfer: 13.02, events: 2.6 },
	{ month: "June", endpoints: 39, transfer: 15.31, events: 3.42 },
];

const requestsByZone = [
	{ day: "Mon", usEast1a: 1240, usEast1b: 1080, usEast1c: 760, euWest1: 1410 },
	{ day: "Tue", usEast1a: 1310, usEast1b: 1140, usEast1c: 820, euWest1: 1520 },
	{ day: "Wed", usEast1a: 1190, usEast1b: 1020, usEast1c: 900, euWest1: 1470 },
	{ day: "Thu", usEast1a: 1420, usEast1b: 1210, usEast1c: 870, euWest1: 1630 },
	{ day: "Fri", usEast1a: 1580, usEast1b: 1330, usEast1c: 940, euWest1: 1710 },
];

const shortMonth = (month: unknown) => String(month).slice(0, 3);

export const Grouped = () => (
	<BarChart.Root
		data={requestsByRegion}
		xKey="month"
		aria-label="Requests by region per month"
		className="h-64"
	>
		<BarChart.Grid />
		<BarChart.XAxis tickFormat={shortMonth} />
		<BarChart.YAxis tickFormat={(value: number) => `${value / 1000}k`} />
		<BarChart.Bar dataKey="usEast" label="US East" />
		<BarChart.Bar dataKey="euWest" label="EU West" />
		<BarChart.Tooltip />
		<BarChart.Legend />
	</BarChart.Root>
);

export const Stacked = () => (
	<BarChart.Root
		data={monthlySpend}
		xKey="month"
		stacked
		aria-label="Monthly spend by line item"
		className="h-64"
	>
		<BarChart.Grid />
		<BarChart.XAxis tickFormat={shortMonth} />
		<BarChart.YAxis tickFormat={(value: number) => `$${value}`} />
		<BarChart.Bar dataKey="endpoints" label="Endpoints" />
		<BarChart.Bar dataKey="transfer" label="Data transfer" />
		<BarChart.Bar dataKey="events" label="Events" />
		<BarChart.Tooltip valueFormat={(value: number) => `$${value.toFixed(2)}`} />
		<BarChart.Legend />
	</BarChart.Root>
);

export const Horizontal = () => (
	<BarChart.Root
		data={endpointRequests}
		xKey="endpoint"
		orientation="horizontal"
		aria-label="Requests by endpoint"
		className="h-64"
	>
		<BarChart.Grid lines="vertical" />
		<BarChart.XAxis />
		<BarChart.YAxis tickFormat={(value: number) => `${value / 1000}k`} />
		<BarChart.Bar dataKey="requests" label="Requests" />
		<BarChart.Tooltip />
	</BarChart.Root>
);

export const TexturedSharedSlot = () => (
	<BarChart.Root
		data={requestsByZone}
		xKey="day"
		stacked
		aria-label="Requests by availability zone"
		className="h-64"
	>
		<BarChart.Grid />
		<BarChart.XAxis />
		<BarChart.YAxis tickFormat={(count: number) => `${count / 1000}k`} />
		<BarChart.Bar dataKey="usEast1a" label="us-east-1a" seriesSlot={1} />
		<BarChart.Bar dataKey="usEast1b" label="us-east-1b" seriesSlot={1} texture="hatch" />
		<BarChart.Bar dataKey="usEast1c" label="us-east-1c" seriesSlot={1} texture="dots" />
		<BarChart.Bar dataKey="euWest1" label="eu-west-1" />
		<BarChart.Tooltip />
		<BarChart.Legend />
	</BarChart.Root>
);
