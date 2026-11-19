import { Button } from "@ngrok/mantle/button";
import { WorldMap } from "@ngrok/mantle/world-map";
import { useEffect, useState } from "react";

import { PreviewCanvas } from "~/components/preview-canvas";

export const agentLocations = [
	{ name: "Ashburn", longitude: -77.49, latitude: 39.04, agents: 42 },
	{ name: "Boardman", longitude: -119.7, latitude: 45.84, agents: 18 },
	{ name: "San Francisco", longitude: -122.42, latitude: 37.77, agents: 9 },
	{ name: "Toronto", longitude: -79.38, latitude: 43.65, agents: 5 },
	{ name: "São Paulo", longitude: -46.63, latitude: -23.55, agents: 7 },
	{ name: "Dublin", longitude: -6.26, latitude: 53.35, agents: 14 },
	{ name: "Frankfurt", longitude: 8.68, latitude: 50.11, agents: 21 },
	{ name: "Stockholm", longitude: 18.07, latitude: 59.33, agents: 3 },
	{ name: "Johannesburg", longitude: 28.05, latitude: -26.2, agents: 2 },
	{ name: "Mumbai", longitude: 72.88, latitude: 19.08, agents: 8 },
	{ name: "Singapore", longitude: 103.82, latitude: 1.35, agents: 16 },
	{ name: "Tokyo", longitude: 139.69, latitude: 35.69, agents: 11 },
	{ name: "Sydney", longitude: 151.21, latitude: -33.87, agents: 6 },
];

export function OverviewExample() {
	return (
		<PreviewCanvas>
			<WorldMap.Root
				data={agentLocations}
				longitudeKey="longitude"
				labelKey="name"
				sizeKey="agents"
				aria-label="Agents by location"
			>
				<WorldMap.Graticule />
				<WorldMap.Point latitudeKey="latitude" label="Agents" color="blue" />
				<WorldMap.Tooltip />
			</WorldMap.Root>
		</PreviewCanvas>
	);
}

export const agentStatuses = [
	{ name: "aws-us-east-1a", longitude: -77.49, online: 39.04, offline: null, blocked: null },
	{ name: "gcp-us-west1", longitude: -121.18, online: 45.6, offline: null, blocked: null },
	{ name: "home-lab", longitude: -97.74, online: null, offline: 30.27, blocked: null },
	{ name: "azure-brazilsouth", longitude: -46.63, online: -23.55, offline: null, blocked: null },
	{ name: "aws-eu-west-1", longitude: -6.26, online: 53.35, offline: null, blocked: null },
	{ name: "hetzner-fsn1", longitude: 12.39, online: 50.48, offline: null, blocked: null },
	{ name: "unknown-vps", longitude: 37.62, online: null, offline: null, blocked: 55.75 },
	{ name: "aws-ap-south-1", longitude: 72.88, online: null, offline: 19.08, blocked: null },
	{ name: "aws-ap-southeast-1", longitude: 103.82, online: 1.35, offline: null, blocked: null },
	{ name: "edge-tokyo", longitude: 139.69, online: 35.69, offline: null, blocked: null },
	{ name: "edge-sydney", longitude: 151.21, online: null, offline: -33.87, blocked: null },
];

export function SeriesExample() {
	return (
		<PreviewCanvas>
			<WorldMap.Root
				data={agentStatuses}
				longitudeKey="longitude"
				labelKey="name"
				aria-label="Agents by status"
			>
				<WorldMap.Graticule />
				<WorldMap.Point latitudeKey="online" label="Online" color="success" />
				<WorldMap.Point latitudeKey="offline" label="Offline" color="neutral" shape="square" />
				<WorldMap.Point
					latitudeKey="blocked"
					label="On a blocklist"
					color="danger"
					shape="diamond"
				/>
				<WorldMap.Tooltip />
				<WorldMap.Legend />
			</WorldMap.Root>
		</PreviewCanvas>
	);
}

export const frankfurt = { longitude: 8.68, latitude: 50.11 };

export function RegionExample() {
	return (
		<PreviewCanvas>
			<WorldMap.Root
				data={[{ name: "Frankfurt am Main, Hesse, Germany", ...frankfurt }]}
				longitudeKey="longitude"
				labelKey="name"
				bounds={{ west: -20, south: 30, east: 45, north: 65 }}
				aria-label="Client location"
			>
				<WorldMap.Point latitudeKey="latitude" label="Client" color="success" />
				<WorldMap.Tooltip />
			</WorldMap.Root>
		</PreviewCanvas>
	);
}

export function CalloutExample() {
	return (
		<PreviewCanvas>
			<WorldMap.Root
				data={[{ name: "Frankfurt am Main, Hesse, Germany", ...frankfurt }]}
				longitudeKey="longitude"
				labelKey="name"
				bounds={{ west: -20, south: 30, east: 45, north: 65 }}
				aria-label="Client location"
			>
				<WorldMap.Point latitudeKey="latitude" label="Client" color="success" />
				<WorldMap.Callout {...frankfurt} side="bottom">
					<p className="text-strong font-medium">Frankfurt am Main, Hesse, Germany</p>
					<p className="text-muted font-mono">203.0.113.77 · Tor exit relay</p>
				</WorldMap.Callout>
			</WorldMap.Root>
		</PreviewCanvas>
	);
}

export const chicago = { longitude: -87.63, latitude: 41.88 };
export const ohio = { longitude: -82.99, latitude: 39.96 };

export function ConnectorExample() {
	return (
		<PreviewCanvas>
			<WorldMap.Root
				data={[
					{
						name: "Chicago, Illinois, United States",
						...chicago,
						client: chicago.latitude,
						edge: null,
					},
					{ name: "ngrok edge, Ohio", ...ohio, client: null, edge: ohio.latitude },
				]}
				longitudeKey="longitude"
				labelKey="name"
				bounds={{ west: -105, south: 30, east: -65, north: 50 }}
				aria-label="Request route"
			>
				<WorldMap.Point latitudeKey="client" label="Client" color="success" />
				<WorldMap.Point latitudeKey="edge" label="ngrok edge" color="accent" shape="diamond" />
				<WorldMap.Connector from={chicago} to={ohio} color="accent" />
				<WorldMap.Callout {...chicago}>
					<p className="text-strong font-medium">Chicago, Illinois, United States</p>
					<p className="text-muted font-mono">198.51.100.18 · Level 3 Parent, LLC</p>
					<p className="text-muted">Entered ngrok at Ohio</p>
				</WorldMap.Callout>
				<WorldMap.Legend />
			</WorldMap.Root>
		</PreviewCanvas>
	);
}

export const liveCities = [
	{ name: "Ashburn", longitude: -77.49, latitude: 39.04 },
	{ name: "Chicago", longitude: -87.63, latitude: 41.88 },
	{ name: "Dallas", longitude: -96.8, latitude: 32.78 },
	{ name: "Seattle", longitude: -122.33, latitude: 47.61 },
	{ name: "Mexico City", longitude: -99.13, latitude: 19.43 },
	{ name: "Bogotá", longitude: -74.07, latitude: 4.71 },
	{ name: "London", longitude: -0.13, latitude: 51.51 },
	{ name: "Paris", longitude: 2.35, latitude: 48.86 },
	{ name: "Madrid", longitude: -3.7, latitude: 40.42 },
	{ name: "Warsaw", longitude: 21.01, latitude: 52.23 },
	{ name: "Lagos", longitude: 3.38, latitude: 6.52 },
	{ name: "Nairobi", longitude: 36.82, latitude: -1.29 },
	{ name: "Dubai", longitude: 55.27, latitude: 25.2 },
	{ name: "Bengaluru", longitude: 77.59, latitude: 12.97 },
	{ name: "Jakarta", longitude: 106.85, latitude: -6.21 },
	{ name: "Hong Kong", longitude: 114.17, latitude: 22.32 },
	{ name: "Seoul", longitude: 126.98, latitude: 37.57 },
	{ name: "Auckland", longitude: 174.76, latitude: -36.85 },
];

export function LiveDataExample() {
	const [running, setRunning] = useState(true);
	const [sessions, setSessions] = useState(() => liveCities.slice(0, 6));
	useEffect(() => {
		if (!running) {
			return;
		}
		const timer = setInterval(() => {
			setSessions((current) => {
				const next = liveCities[Math.floor(Math.random() * liveCities.length)];
				if (next == null) {
					return current;
				}
				const kept = current.filter((city) => city.name !== next.name);
				return [...kept, next].slice(-10);
			});
		}, 1200);
		return () => clearInterval(timer);
	}, [running]);
	return (
		<PreviewCanvas className="flex-col items-start gap-3">
			<Button
				type="button"
				appearance="outlined"
				intent="neutral"
				onClick={() => setRunning((value) => !value)}
			>
				{running ? "Pause updates" : "Resume updates"}
			</Button>
			<WorldMap.Root
				data={sessions}
				longitudeKey="longitude"
				labelKey="name"
				aria-label="Agents that connected most recently"
			>
				<WorldMap.Point latitudeKey="latitude" label="Connected agents" color="blue" />
				<WorldMap.Tooltip />
			</WorldMap.Root>
		</PreviewCanvas>
	);
}
