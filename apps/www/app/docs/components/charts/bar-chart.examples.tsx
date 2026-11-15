import { Badge } from "@ngrok/mantle/badge";
import { BarChart, type BarChartBarProps } from "@ngrok/mantle/bar-chart";
import { Button } from "@ngrok/mantle/button";
import { Card } from "@ngrok/mantle/card";
import { Empty } from "@ngrok/mantle/empty";
import { useEffect, useState } from "react";

import { PreviewCanvas } from "~/components/preview-canvas";

export const endpointsByRegion = [
	{ month: "January", usEast: 41, euWest: 0, apSouth: 0 },
	{ month: "February", usEast: 52, euWest: 0, apSouth: 0 },
	{ month: "March", usEast: 0, euWest: 38, apSouth: 0 },
	{ month: "April", usEast: 0, euWest: 44, apSouth: 12 },
	{ month: "May", usEast: 18, euWest: 0, apSouth: 26 },
	{ month: "June", usEast: 23, euWest: 51, apSouth: 31 },
];

export function SparseStackBarChartExample() {
	return (
		<div className="grid w-full gap-6 sm:grid-cols-2">
			<BarChart.Root
				data={endpointsByRegion}
				xKey="month"
				stacked
				aria-label="Active endpoints by region"
			>
				<BarChart.Grid />
				<BarChart.XAxis tickFormat={(month) => String(month).slice(0, 3)} />
				<BarChart.YAxis />
				<BarChart.Bar dataKey="usEast" label="US East" color="blue" />
				<BarChart.Bar dataKey="euWest" label="EU West" color="emerald" />
				<BarChart.Bar dataKey="apSouth" label="AP South" color="pink" />
				<BarChart.Legend />
			</BarChart.Root>
			<BarChart.Root
				data={endpointsByRegion}
				xKey="month"
				stacked
				orientation="horizontal"
				aria-label="Active endpoints by region, horizontal"
			>
				<BarChart.Grid lines="vertical" />
				<BarChart.XAxis />
				<BarChart.YAxis tickFormat={(month) => String(month).slice(0, 3)} />
				<BarChart.Bar dataKey="usEast" label="US East" color="blue" />
				<BarChart.Bar dataKey="euWest" label="EU West" color="emerald" />
				<BarChart.Bar dataKey="apSouth" label="AP South" color="pink" />
				<BarChart.Legend />
			</BarChart.Root>
		</div>
	);
}

export const monthlySpend = [
	{ month: "January", endpoints: 39, transfer: 11.42, events: 0.28 },
	{ month: "February", endpoints: 39, transfer: 12.06, events: 0.31 },
	{ month: "March", endpoints: 39, transfer: 9.87, events: 0.004 },
	{ month: "April", endpoints: 39, transfer: 14.55, events: 0.19 },
	{ month: "May", endpoints: 39, transfer: 13.02, events: 0 },
	{ month: "June", endpoints: 39, transfer: 15.31, events: 0.42 },
];

export function SubCentBarChartExample() {
	return (
		<BarChart.Root data={monthlySpend} xKey="month" stacked aria-label="Monthly spend by line item">
			<BarChart.Grid />
			<BarChart.XAxis tickFormat={(month) => String(month).slice(0, 3)} />
			<BarChart.YAxis tickFormat={(value) => `$${value}`} />
			<BarChart.Bar dataKey="endpoints" label="Endpoints" color="blue" />
			<BarChart.Bar dataKey="transfer" label="Transfer" color="emerald" />
			<BarChart.Bar dataKey="events" label="Events" color="pink" />
			<BarChart.Tooltip valueFormat={(value) => `$${value.toFixed(3)}`} />
			<BarChart.Legend />
		</BarChart.Root>
	);
}

export const netEndpointChange = [
	{ month: "January", added: 128, churned: -34, suspended: -11 },
	{ month: "February", added: 96, churned: -52, suspended: -8 },
	{ month: "March", added: 141, churned: -27, suspended: -19 },
	{ month: "April", added: 62, churned: -88, suspended: -24 },
	{ month: "May", added: 118, churned: -41, suspended: 0 },
	{ month: "June", added: 154, churned: -36, suspended: -14 },
];

export function DivergingBarChartExample() {
	return (
		<BarChart.Root
			data={netEndpointChange}
			xKey="month"
			stacked
			aria-label="Net change in active endpoints"
		>
			<BarChart.Grid />
			<BarChart.XAxis tickFormat={(month) => String(month).slice(0, 3)} />
			<BarChart.YAxis />
			<BarChart.Bar dataKey="added" label="Added" color="success" />
			<BarChart.Bar dataKey="churned" label="Churned" color="danger" />
			{/*
			 * Both negative series stack below zero, so they always touch. The
			 * texture keeps them apart for a reader who cannot tell rose from amber.
			 */}
			<BarChart.Bar dataKey="suspended" label="Suspended" color="warning" texture="hatch" />
			<BarChart.Tooltip />
			<BarChart.Legend />
		</BarChart.Root>
	);
}

export const requestsByProtocol = [
	{ month: "January", http: 1240, tcp: 910, tls: 640 },
	{ month: "February", http: 1385, tcp: 845, tls: 705 },
	{ month: "March", http: 1520, tcp: 1010, tls: 590 },
	{ month: "April", http: 1180, tcp: 1145, tls: 820 },
	{ month: "May", http: 1660, tcp: 980, tls: 735 },
	{ month: "June", http: 1745, tcp: 1220, tls: 880 },
];

export function StackedActivationBarChartExample() {
	const [lastActivated, setLastActivated] = useState("Click a segment.");
	return (
		<div className="w-full">
			<BarChart.Root
				data={requestsByProtocol}
				xKey="month"
				stacked
				aria-label="Requests by protocol"
				onDatumActivate={(event) => {
					const series = event.dataKey == null ? "whole month" : event.dataKey;
					setLastActivated(`Activated ${String(event.xValue)} (${series}).`);
				}}
			>
				<BarChart.Grid />
				<BarChart.XAxis tickFormat={(month) => String(month).slice(0, 3)} />
				<BarChart.YAxis tickFormat={(value) => `${value}k`} />
				<BarChart.Bar dataKey="http" label="HTTP" color="blue" />
				<BarChart.Bar dataKey="tcp" label="TCP" color="emerald" />
				<BarChart.Bar dataKey="tls" label="TLS" color="pink" />
				<BarChart.Legend />
			</BarChart.Root>
			<p className="text-muted mt-3 text-sm">{lastActivated}</p>
		</div>
	);
}

export const noUsageYet = [
	{ month: "January", requests: 0 },
	{ month: "February", requests: 0 },
	{ month: "March", requests: 0 },
	{ month: "April", requests: 0 },
	{ month: "May", requests: 0 },
	{ month: "June", requests: 0 },
];

export function NoUsageYetBarChartExample() {
	return (
		<BarChart.Root data={noUsageYet} xKey="month" aria-label="Requests by month">
			<BarChart.Grid />
			<BarChart.XAxis tickFormat={(month) => String(month).slice(0, 3)} />
			<BarChart.YAxis />
			<BarChart.Bar dataKey="requests" label="Requests" color="blue" />
			<BarChart.Tooltip />
		</BarChart.Root>
	);
}

export const spendByProvider = [
	{ month: "April", aws: 1610, gcp: 1145, azure: 520, onPrem: 141 },
	{ month: "May", aws: 1745, gcp: 1080, azure: 565, onPrem: 133 },
	{ month: "June", aws: 1890, gcp: 1220, azure: 610, onPrem: 152 },
];

export const spendByRegion = [
	{ month: "April", usEast: 1495, usWest: 828, euWest: 690, apSouth: 403 },
	{ month: "May", usEast: 1580, usWest: 874, euWest: 745, apSouth: 434 },
	{ month: "June", usEast: 1712, usWest: 940, euWest: 803, apSouth: 417 },
];

export const spendByAccessKey = [
	{ month: "April", ci: 1240, staging: 762, production: 1330, laptop: 84 },
	{ month: "May", ci: 1315, staging: 810, production: 1440, laptop: 68 },
	{ month: "June", ci: 1428, staging: 869, production: 1560, laptop: 15 },
];

type Grouping = {
	label: string;
	data: ReadonlyArray<Record<string, string | number>>;
	series: ReadonlyArray<
		readonly [dataKey: string, label: string, color: BarChartBarProps["color"]]
	>;
};

export const groupings: Record<"provider" | "region" | "accessKey", Grouping> = {
	provider: {
		label: "By provider",
		data: spendByProvider,
		series: [
			["aws", "AWS", "amber"],
			["gcp", "GCP", "blue"],
			["azure", "Azure", "violet"],
			["onPrem", "On-prem", "teal"],
		],
	},
	region: {
		label: "By region",
		data: spendByRegion,
		series: [
			["usEast", "US East", "blue"],
			["usWest", "US West", "emerald"],
			["euWest", "EU West", "violet"],
			["apSouth", "AP South", "amber"],
		],
	},
	accessKey: {
		label: "By access key",
		data: spendByAccessKey,
		series: [
			["ci", "CI", "blue"],
			["staging", "Staging", "amber"],
			["production", "Production", "emerald"],
			["laptop", "Laptop", "pink"],
		],
	},
};

export function RegroupBarChartExample() {
	const [active, setActive] = useState<Grouping>(groupings.provider);
	return (
		<div className="w-full">
			<div className="mb-3 flex flex-wrap gap-2">
				{Object.values(groupings).map((option) => (
					<Button
						key={option.label}
						appearance={option === active ? "filled" : "outlined"}
						intent="accent"
						onClick={() => setActive(option)}
					>
						{option.label}
					</Button>
				))}
			</div>
			{/* No `key` on the Root: remounting it would replay the enter animation
			    on every switch and hide the behavior this example exists to show. */}
			<BarChart.Root data={active.data} xKey="month" aria-label="Monthly requests by grouping">
				<BarChart.Grid />
				<BarChart.XAxis tickFormat={(month) => String(month).slice(0, 3)} />
				<BarChart.YAxis />
				{active.series.map(([dataKey, label, color]) => (
					<BarChart.Bar key={dataKey} dataKey={dataKey} label={label} color={color} />
				))}
				<BarChart.Legend />
			</BarChart.Root>
		</div>
	);
}

export const requestsByModelProvider = [
	{ day: "Mon", openai: 4210, gemini: 1640, claude: 3180, acmeLlm: 820, byoRouter: 310 },
	{ day: "Tue", openai: 4620, gemini: 1780, claude: 3540, acmeLlm: 910, byoRouter: 380 },
	{ day: "Wed", openai: 3980, gemini: 2010, claude: 3920, acmeLlm: 1140, byoRouter: 420 },
	{ day: "Thu", openai: 5100, gemini: 1930, claude: 4180, acmeLlm: 1020, byoRouter: 470 },
	{ day: "Fri", openai: 5340, gemini: 2240, claude: 4460, acmeLlm: 1310, byoRouter: 510 },
];

export function BrandColorBarChartExample() {
	return (
		<BarChart.Root
			data={requestsByModelProvider}
			xKey="day"
			stacked
			// The bars and the legend swatch both resolve through this
			// element's own cascade. A theme that needs its own value takes a variant:
			// `dark:[--provider-claude:…]`.
			className="[--provider-openai:#10a37f] [--provider-gemini:#3186ff] [--provider-claude:#d97757]"
			aria-label="Requests by model provider"
		>
			<BarChart.Grid />
			<BarChart.XAxis />
			<BarChart.YAxis tickFormat={(count) => `${count / 1000}k`} />
			{/* Known providers keep one color for as long as the app declares it. Claude
			    sits between the other two on purpose, and wears a texture because it runs
			    close to OpenAI under simulated color vision deficiency (see the note
			    above). */}
			<BarChart.Bar dataKey="openai" label="OpenAI" color="var(--provider-openai)" />
			<BarChart.Bar
				dataKey="claude"
				label="Claude"
				color="var(--provider-claude)"
				texture="hatch"
			/>
			<BarChart.Bar dataKey="gemini" label="Gemini" color="var(--provider-gemini)" />
			{/* Providers with no brand color take mantle names that stay clear of the
			    three brand hues. */}
			<BarChart.Bar dataKey="acmeLlm" label="Acme LLM" color="fuchsia" />
			<BarChart.Bar dataKey="byoRouter" label="BYO Router" color="cyan" />
			<BarChart.Tooltip />
			<BarChart.Legend />
		</BarChart.Root>
	);
}

export const monthlyVisitors = [
	{ month: "January", desktop: 186, mobile: 80 },
	{ month: "February", desktop: 305, mobile: 200 },
	{ month: "March", desktop: 237, mobile: 120 },
	{ month: "April", desktop: 73, mobile: 190 },
	{ month: "May", desktop: 209, mobile: 130 },
	{ month: "June", desktop: 214, mobile: 140 },
];

export function SeriesIdentityBarChartExample() {
	return (
		// An app declares its brand token once, high in the tree. This example
		// declares it on the wrapper so it stands alone. A theme that needs its own
		// value takes a variant: `dark:[--color-brand:…]`.
		<div className="grid w-full gap-6 [--color-brand:#d07c00] sm:grid-cols-2">
			<BarChart.Root
				data={monthlyVisitors}
				xKey="month"
				className="[--color-chart-blue:var(--color-brand)]"
				aria-label="Visitors by month, blue restyled"
			>
				<BarChart.Grid />
				<BarChart.XAxis tickFormat={(month) => String(month).slice(0, 3)} />
				<BarChart.YAxis />
				<BarChart.Bar dataKey="desktop" label="Desktop" color="blue" />
				<BarChart.Bar dataKey="mobile" label="Mobile" color="emerald" />
				<BarChart.Legend />
			</BarChart.Root>
			{/* The sibling never sees the declaration above, so its Desktop series
			    keeps the theme blue. */}
			<BarChart.Root
				data={monthlyVisitors}
				xKey="month"
				aria-label="Visitors by month, one color overridden"
			>
				<BarChart.Grid />
				<BarChart.XAxis tickFormat={(month) => String(month).slice(0, 3)} />
				<BarChart.YAxis />
				<BarChart.Bar dataKey="desktop" label="Desktop" color="blue" />
				<BarChart.Bar dataKey="mobile" label="Mobile" color="var(--color-brand)" />
				<BarChart.Legend />
			</BarChart.Root>
		</div>
	);
}

export const dailyRequests = Array.from({ length: 91 }, (_, day) => {
	const date = new Date(2026, 3, 1 + day);
	const weekend = date.getDay() === 0 || date.getDay() === 6;
	return {
		date,
		requests: Math.round(
			(weekend ? 0.55 : 1) *
				(52_000 + 14_000 * Math.sin(day / 9) + 9_000 * Math.sin(day / 2.7) + 120 * day),
		),
	};
});

export const shortDate = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

export function DailyBarChartExample() {
	return (
		<BarChart.Root
			data={dailyRequests}
			xKey="date"
			aria-label="HTTP requests per day over the last three months"
		>
			<BarChart.Grid />
			<BarChart.XAxis tickFormat={(date) => shortDate.format(new Date(date))} />
			<BarChart.YAxis />
			<BarChart.Bar dataKey="requests" label="Requests" color="blue" />
		</BarChart.Root>
	);
}

export function CopyMarkdownExample() {
	return (
		<BarChart.Root data={monthlyVisitors} xKey="month" aria-label="Visitors by month, copyable">
			<BarChart.Grid />
			<BarChart.XAxis tickFormat={(month) => String(month).slice(0, 3)} />
			<BarChart.YAxis />
			<BarChart.Bar dataKey="desktop" label="Desktop" color="blue" />
			<BarChart.Bar dataKey="mobile" label="Mobile" color="emerald" />
			<BarChart.Tooltip />
			<BarChart.Legend />
			<BarChart.CopyButton className="absolute right-0 top-0" />
		</BarChart.Root>
	);
}

export const endpointRequests = [
	{ endpoint: "/api/tunnels", requests: 4820 },
	{ endpoint: "/api/edges", requests: 3190 },
	{ endpoint: "/api/domains", requests: 2440 },
	{ endpoint: "/api/certs", requests: 1210 },
	{ endpoint: "/api/events", requests: 640 },
];

export function GroupedBarChartExample() {
	return (
		<BarChart.Root data={monthlyVisitors} xKey="month" aria-label="Visitors by month">
			<BarChart.Grid />
			<BarChart.XAxis tickFormat={(month) => String(month).slice(0, 3)} />
			<BarChart.YAxis />
			<BarChart.Bar dataKey="desktop" label="Desktop" color="blue" />
			<BarChart.Bar dataKey="mobile" label="Mobile" color="emerald" />
			<BarChart.Tooltip />
			<BarChart.Legend />
		</BarChart.Root>
	);
}

export function HorizontalBarChartExample() {
	return (
		<BarChart.Root
			data={endpointRequests}
			xKey="endpoint"
			orientation="horizontal"
			aria-label="Requests by endpoint"
		>
			<BarChart.Grid lines="vertical" />
			<BarChart.XAxis />
			<BarChart.YAxis />
			<BarChart.Bar dataKey="requests" label="Requests" color="blue" />
			<BarChart.Tooltip />
		</BarChart.Root>
	);
}

export const deviceVisitors = [
	{ month: "January", desktop: 186, mobile: 80, tablet: 47, tv: 22, kiosk: 14 },
	{ month: "February", desktop: 305, mobile: 200, tablet: 65, tv: 31, kiosk: 18 },
	{ month: "March", desktop: 237, mobile: 120, tablet: 52, tv: 26, kiosk: 12 },
	{ month: "April", desktop: 73, mobile: 190, tablet: 41, tv: 19, kiosk: 9 },
	{ month: "May", desktop: 209, mobile: 130, tablet: 58, tv: 28, kiosk: 16 },
	{ month: "June", desktop: 214, mobile: 140, tablet: 63, tv: 34, kiosk: 21 },
];

export function TexturedBarChartExample() {
	return (
		<BarChart.Root
			data={deviceVisitors}
			xKey="month"
			stacked
			aria-label="Visitors by month and device"
		>
			<BarChart.Grid />
			<BarChart.XAxis tickFormat={(month) => String(month).slice(0, 3)} />
			<BarChart.YAxis />
			<BarChart.Bar dataKey="desktop" label="Desktop" color="blue" />
			<BarChart.Bar dataKey="mobile" label="Mobile" texture="hatch" color="emerald" />
			<BarChart.Bar dataKey="tablet" label="Tablet" texture="dots" color="pink" />
			<BarChart.Bar dataKey="tv" label="TV" texture="parallel" color="orange" />
			<BarChart.Bar dataKey="kiosk" label="Kiosk" texture="grid" color="teal" />
			<BarChart.Legend />
		</BarChart.Root>
	);
}

export const requestsByZone = [
	{ day: "Mon", usEast1a: 1240, usEast1b: 1080, usEast1c: 760, euWest1: 1410 },
	{ day: "Tue", usEast1a: 1310, usEast1b: 1140, usEast1c: 820, euWest1: 1520 },
	{ day: "Wed", usEast1a: 1190, usEast1b: 1020, usEast1c: 900, euWest1: 1470 },
	{ day: "Thu", usEast1a: 1420, usEast1b: 1210, usEast1c: 870, euWest1: 1630 },
	{ day: "Fri", usEast1a: 1580, usEast1b: 1330, usEast1c: 940, euWest1: 1710 },
];

export function SharedColorBarChartExample() {
	return (
		<BarChart.Root
			data={requestsByZone}
			xKey="day"
			stacked
			aria-label="Requests by availability zone"
		>
			<BarChart.Grid />
			<BarChart.XAxis />
			<BarChart.YAxis tickFormat={(count) => `${count / 1000}k`} />
			{/* One region, one color: the three us-east zones share blue and stay
			    apart by texture. */}
			<BarChart.Bar dataKey="usEast1a" label="us-east-1a" color="blue" />
			<BarChart.Bar dataKey="usEast1b" label="us-east-1b" color="blue" texture="hatch" />
			<BarChart.Bar dataKey="usEast1c" label="us-east-1c" color="blue" texture="dots" />
			<BarChart.Bar dataKey="euWest1" label="eu-west-1" color="amber" />
			<BarChart.Tooltip />
			<BarChart.Legend />
		</BarChart.Root>
	);
}

export function agentThroughput(seed: number) {
	// The last hour of one agent's throughput, in 30 buckets of two minutes,
	// oldest first. The seed gives each agent its own shape.
	return Array.from({ length: 30 }, (_, bucket) => {
		const step = bucket + seed * 7;
		const swell = Math.sin(step * 0.42) * 0.5 + 0.5;
		const chop = Math.sin(step * 1.87) * 0.5 + 0.5;
		const noise = (offset: number) => {
			const value = Math.sin((step + offset) * 12.9898) * 43758.5453;
			return value - Math.floor(value);
		};
		const spike = ({
			every,
			factor,
			dipEvery,
			dip,
		}: {
			every: number;
			factor: number;
			dipEvery: number;
			dip: number;
		}) => {
			if (step % every === 0) {
				return factor;
			}
			if (step % dipEvery === 0) {
				return dip;
			}
			return 1;
		};
		const inSpike = spike({ every: 11, factor: 1.8, dipEvery: 6, dip: 0.32 });
		const outSpike = spike({ every: 9, factor: 1.65, dipEvery: 7, dip: 0.28 });
		return {
			minutesAgo: (29 - bucket) * 2,
			in: Math.max(18, (70 + swell * 430 + chop * 180 + noise(0) * 190) * inSpike),
			out: Math.max(12, (50 + (1 - swell) * 340 + chop * 250 + noise(99) * 210) * outSpike),
		};
	});
}

export const agents = [
	{ name: "api-gateway-staging", version: "4.4.1", location: "US-VA-1", endpoints: 6 },
	{ name: "billing-worker", version: "4.5.0", location: "US-VA-1", endpoints: 5 },
	{ name: "brians-mac-mini", version: "4.4.1", location: "US-CAL-1", endpoints: 3 },
].map((agent, seed) => ({ ...agent, traffic: agentThroughput(seed) }));

export function AgentTrafficBarChartExample() {
	return (
		<BarChart.List className="flex w-full flex-col gap-3">
			{agents.map((agent) => (
				<Card.Root key={agent.name}>
					<Card.Body className="flex flex-col gap-4 sm:flex-row sm:items-end">
						<div className="flex min-w-0 flex-1 flex-col gap-2">
							<span className="text-strong font-medium">{agent.name}</span>
							<div className="flex flex-wrap items-center gap-2 text-sm">
								<span>{agent.version}</span>
								<Badge appearance="muted" color="neutral">
									US
								</Badge>
								<Badge appearance="muted" color="neutral">
									{agent.location}
								</Badge>
								<span>{agent.endpoints} endpoints</span>
							</div>
						</div>
						<BarChart.Root
							data={agent.traffic}
							xKey="minutesAgo"
							stacked
							aria-label={`Throughput for ${agent.name} over the last hour`}
							className="aspect-auto h-20 w-full sm:max-w-120 sm:min-w-60 sm:flex-1"
						>
							{/* One agent, one color: Out sits on the baseline, and the
							    hatch marks In on top of it. */}
							<BarChart.Bar dataKey="out" label="Out" color="neutral" />
							<BarChart.Bar dataKey="in" label="In" color="neutral" texture="hatch" />
							<BarChart.Tooltip
								labelFormat={(minutesAgo) =>
									minutesAgo === 0 ? "Just now" : `${String(minutesAgo)}m ago`
								}
								valueFormat={(gbits) => `${gbits.toFixed(1)} Gbits/s`}
							/>
						</BarChart.Root>
					</Card.Body>
				</Card.Root>
			))}
		</BarChart.List>
	);
}

export function StackedBarChartExample() {
	return (
		<BarChart.Root data={monthlyVisitors} xKey="month" stacked aria-label="Visitors by month">
			<BarChart.Grid />
			<BarChart.XAxis tickFormat={(month) => String(month).slice(0, 3)} />
			<BarChart.YAxis />
			<BarChart.Bar dataKey="desktop" label="Desktop" color="blue" />
			<BarChart.Bar dataKey="mobile" label="Mobile" color="emerald" />
			<BarChart.Legend />
		</BarChart.Root>
	);
}

export function SingleSeriesBarChartExample() {
	return (
		<div className="w-full">
			<h4 id="endpoint-requests-title" className="text-strong mb-2 text-sm font-medium">
				Requests by endpoint (last 24 hours)
			</h4>
			<BarChart.Root
				data={endpointRequests}
				xKey="endpoint"
				aria-labelledby="endpoint-requests-title"
			>
				<BarChart.Grid />
				<BarChart.XAxis />
				<BarChart.YAxis />
				<BarChart.Bar dataKey="requests" label="Requests" color="blue" />
			</BarChart.Root>
		</div>
	);
}

export const failedDeploys = [
	{ weekday: "Monday", failures: 1 },
	{ weekday: "Tuesday", failures: 0 },
	{ weekday: "Wednesday", failures: 3 },
	{ weekday: "Thursday", failures: 2 },
	{ weekday: "Friday", failures: 1 },
];

export function IntegerCountsBarChartExample() {
	return (
		<BarChart.Root data={failedDeploys} xKey="weekday" aria-label="Failed deploys by weekday">
			<BarChart.Grid />
			<BarChart.XAxis tickFormat={(weekday) => String(weekday).slice(0, 3)} />
			<BarChart.YAxis />
			<BarChart.Bar dataKey="failures" label="Failures" color="blue" />
			<BarChart.Tooltip />
		</BarChart.Root>
	);
}

export function ReferenceLineBarChartExample() {
	return (
		<BarChart.Root data={monthlyVisitors} xKey="month" aria-label="Visitors by month">
			<BarChart.Grid />
			<BarChart.XAxis tickFormat={(month) => String(month).slice(0, 3)} />
			<BarChart.YAxis />
			<BarChart.Bar dataKey="desktop" label="Desktop" color="blue" />
			<BarChart.Bar dataKey="mobile" label="Mobile" color="emerald" />
			<BarChart.ReferenceLine y={250} label="Capacity" />
			<BarChart.Legend />
		</BarChart.Root>
	);
}

export function CustomTooltipBarChartExample() {
	return (
		<BarChart.Root data={monthlyVisitors} xKey="month" aria-label="Visitors by month">
			<BarChart.Grid />
			<BarChart.XAxis tickFormat={(month) => String(month).slice(0, 3)} />
			<BarChart.YAxis />
			<BarChart.Bar dataKey="desktop" label="Desktop" color="blue" />
			<BarChart.Bar dataKey="mobile" label="Mobile" color="emerald" />
			<BarChart.Tooltip
				valueFormat={(value) => `${value.toLocaleString()} visits`}
				footer="Click a month to view traffic logs"
			/>
			<BarChart.Legend />
		</BarChart.Root>
	);
}

export function ActivationBarChartExample() {
	const [lastActivated, setLastActivated] = useState("Nothing activated yet.");
	return (
		<div className="w-full">
			<BarChart.Root
				data={monthlyVisitors}
				xKey="month"
				aria-label="Visitors by month"
				onDatumActivate={(event) => {
					const series = event.dataKey == null ? "whole month" : event.dataKey;
					setLastActivated(`Activated ${String(event.xValue)} (${series}).`);
				}}
			>
				<BarChart.Grid />
				<BarChart.XAxis tickFormat={(month) => String(month).slice(0, 3)} />
				<BarChart.YAxis />
				<BarChart.Bar dataKey="desktop" label="Desktop" color="blue" />
				<BarChart.Bar dataKey="mobile" label="Mobile" color="emerald" />
				<BarChart.Legend />
			</BarChart.Root>
			<p className="text-muted mt-3 text-sm">{lastActivated}</p>
		</div>
	);
}

export function ControlledHoverBarChartExample() {
	const [activeIndex, setActiveIndex] = useState<number | null>(null);
	return (
		<div className="w-full">
			<BarChart.Root
				data={monthlyVisitors}
				xKey="month"
				aria-label="Visitors by month"
				activeIndex={activeIndex}
				onActiveIndexChange={setActiveIndex}
			>
				<BarChart.Grid />
				<BarChart.XAxis tickFormat={(month) => String(month).slice(0, 3)} />
				<BarChart.YAxis />
				<BarChart.Bar dataKey="desktop" label="Desktop" color="blue" />
				<BarChart.Bar dataKey="mobile" label="Mobile" color="emerald" />
				<BarChart.Legend />
			</BarChart.Root>
			<div className="mt-3 flex items-center gap-3">
				<Button
					type="button"
					appearance="outlined"
					intent="accent"
					onClick={() => setActiveIndex(activeIndex === 1 ? null : 1)}
				>
					{activeIndex === 1 ? "Unpin February" : "Pin February"}
				</Button>
				<span className="text-muted text-sm">
					activeIndex: {activeIndex == null ? "null" : activeIndex}
				</span>
			</div>
		</div>
	);
}

export function PendingBarChartExample() {
	const [pending, setPending] = useState(false);
	return (
		<div className="w-full">
			<BarChart.Root
				data={monthlyVisitors}
				xKey="month"
				pending={pending}
				aria-label="Visitors by month"
			>
				<BarChart.Grid />
				<BarChart.XAxis tickFormat={(month) => String(month).slice(0, 3)} />
				<BarChart.YAxis />
				<BarChart.Bar dataKey="desktop" label="Desktop" color="blue" />
				<BarChart.Bar dataKey="mobile" label="Mobile" color="emerald" />
				<BarChart.Legend />
			</BarChart.Root>
			<Button
				type="button"
				appearance="outlined"
				intent="accent"
				className="mt-3"
				onClick={() => setPending(!pending)}
			>
				{pending ? "Finish refetch" : "Simulate refetch"}
			</Button>
		</div>
	);
}

export function liveConnections(tick: number) {
	const regions = ["us-east", "us-west", "eu-west", "eu-central", "ap-southeast", "sa-east"];
	return regions.map((region, index) => ({
		region,
		connections: Math.round(
			900 + 460 * Math.sin(tick / 10 + index * 1.7) + 210 * Math.sin(tick / 3.6 + index * 0.9),
		),
	}));
}

export function LiveBarChartExample() {
	const [tick, setTick] = useState(0);
	useEffect(() => {
		const interval = setInterval(() => {
			setTick((current) => current + 1);
		}, 400);
		return () => clearInterval(interval);
	}, []);
	return (
		<BarChart.Root
			data={liveConnections(tick)}
			xKey="region"
			aria-label="Live connections by region"
		>
			<BarChart.Grid />
			<BarChart.XAxis />
			<BarChart.YAxis />
			<BarChart.Bar dataKey="connections" label="Connections" color="blue" />
			<BarChart.Tooltip />
		</BarChart.Root>
	);
}

export const placeholderUsage = [40, 62, 51, 78, 66, 89, 72].map((value, index) => ({
	day: `Day ${index + 1}`,
	value,
}));

export function EmptyStateBarChartExample() {
	return (
		<div className="relative w-full">
			<BarChart.Root data={placeholderUsage} xKey="day" mode="decorative">
				<BarChart.Bar dataKey="value" color="blue" />
			</BarChart.Root>
			<Empty.Root className="absolute inset-0 m-auto h-fit w-fit">
				<Empty.Title>No usage yet</Empty.Title>
				<Empty.Description>
					<p>Traffic will appear here once your endpoints start receiving requests.</p>
				</Empty.Description>
			</Empty.Root>
		</div>
	);
}

/** The first example on the Bar Chart docs page. */
export function OverviewExample() {
	return (
		<PreviewCanvas>
			<DailyBarChartExample />
		</PreviewCanvas>
	);
}

/** The "Grouped bars" example on the Bar Chart docs page. */
export function GroupedBarsExample() {
	return (
		<PreviewCanvas>
			<GroupedBarChartExample />
		</PreviewCanvas>
	);
}

/** The "Stacked bars" example on the Bar Chart docs page. */
export function StackedBarsExample() {
	return (
		<PreviewCanvas>
			<StackedBarChartExample />
		</PreviewCanvas>
	);
}

/** The "Sparse stacks" example on the Bar Chart docs page. */
export function SparseStacksExample() {
	return (
		<PreviewCanvas>
			<SparseStackBarChartExample />
		</PreviewCanvas>
	);
}

/** The "Segments smaller than the surface gap" example on the Bar Chart docs page. */
export function SegmentsSmallerThanTheSurfaceGapExample() {
	return (
		<PreviewCanvas>
			<SubCentBarChartExample />
		</PreviewCanvas>
	);
}

/** The "Diverging stacks" example on the Bar Chart docs page. */
export function DivergingStacksExample() {
	return (
		<PreviewCanvas>
			<DivergingBarChartExample />
		</PreviewCanvas>
	);
}

/** The "No usage yet" example on the Bar Chart docs page. */
export function NoUsageYetExample() {
	return (
		<PreviewCanvas>
			<NoUsageYetBarChartExample />
		</PreviewCanvas>
	);
}

/** The "Regrouping a live chart" example on the Bar Chart docs page. */
export function RegroupingALiveChartExample() {
	return (
		<PreviewCanvas>
			<RegroupBarChartExample />
		</PreviewCanvas>
	);
}

/** The "Brand colors" example on the Bar Chart docs page. */
export function BrandColorsExample() {
	return (
		<PreviewCanvas>
			<BrandColorBarChartExample />
		</PreviewCanvas>
	);
}

/** The "Horizontal bars" example on the Bar Chart docs page. */
export function HorizontalBarsExample() {
	return (
		<PreviewCanvas>
			<HorizontalBarChartExample />
		</PreviewCanvas>
	);
}

/** The "Textures" example on the Bar Chart docs page. */
export function TexturesExample() {
	return (
		<PreviewCanvas>
			<TexturedBarChartExample />
		</PreviewCanvas>
	);
}

/** The "Sharing one color" example on the Bar Chart docs page. */
export function SharingOneColorExample() {
	return (
		<PreviewCanvas>
			<SharedColorBarChartExample />
		</PreviewCanvas>
	);
}

/** The "Neutral bars in a card list" example on the Bar Chart docs page. */
export function NeutralBarsInACardListExample() {
	return (
		<PreviewCanvas>
			<AgentTrafficBarChartExample />
		</PreviewCanvas>
	);
}

/** The "Single series" example on the Bar Chart docs page. */
export function SingleSeriesExample() {
	return (
		<PreviewCanvas>
			<SingleSeriesBarChartExample />
		</PreviewCanvas>
	);
}

/** The "Integer counts" example on the Bar Chart docs page. */
export function IntegerCountsExample() {
	return (
		<PreviewCanvas>
			<IntegerCountsBarChartExample />
		</PreviewCanvas>
	);
}

/** The "Reference lines" example on the Bar Chart docs page. */
export function ReferenceLinesExample() {
	return (
		<PreviewCanvas>
			<ReferenceLineBarChartExample />
		</PreviewCanvas>
	);
}

/** The "Custom tooltip" example on the Bar Chart docs page. */
export function CustomTooltipExample() {
	return (
		<PreviewCanvas>
			<CustomTooltipBarChartExample />
		</PreviewCanvas>
	);
}

/** The "Activation" example on the Bar Chart docs page. */
export function ActivationExample() {
	return (
		<PreviewCanvas>
			<ActivationBarChartExample />
		</PreviewCanvas>
	);
}

/** The "Activating a stacked segment" example on the Bar Chart docs page. */
export function ActivatingAStackedSegmentExample() {
	return (
		<PreviewCanvas>
			<StackedActivationBarChartExample />
		</PreviewCanvas>
	);
}

/** The "Controlled hover" example on the Bar Chart docs page. */
export function ControlledHoverExample() {
	return (
		<PreviewCanvas>
			<ControlledHoverBarChartExample />
		</PreviewCanvas>
	);
}

/** The "Pending data" example on the Bar Chart docs page. */
export function PendingDataExample() {
	return (
		<PreviewCanvas>
			<PendingBarChartExample />
		</PreviewCanvas>
	);
}

/** The "Live data" example on the Bar Chart docs page. */
export function LiveDataExample() {
	return (
		<PreviewCanvas>
			<LiveBarChartExample />
		</PreviewCanvas>
	);
}

/** The "Copy as markdown" example on the Bar Chart docs page. */
export function CopyAsMarkdownExample() {
	return (
		<PreviewCanvas>
			<CopyMarkdownExample />
		</PreviewCanvas>
	);
}

/** The "Decorative charts" example on the Bar Chart docs page. */
export function DecorativeChartsExample() {
	return (
		<PreviewCanvas>
			<EmptyStateBarChartExample />
		</PreviewCanvas>
	);
}

/** The "Restyle a color name" example on the Bar Chart docs page. */
export function RestyleAColorNameExample() {
	return (
		<PreviewCanvas>
			<SeriesIdentityBarChartExample />
		</PreviewCanvas>
	);
}
