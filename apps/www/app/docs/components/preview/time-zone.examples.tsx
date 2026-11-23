import { Table } from "@ngrok/mantle/table";
import { LocalTime, TimeZoneProvider } from "@ngrok/mantle/time-zone";

import { PreviewCanvas } from "~/components/preview-canvas";

const endpoints = [
	{ url: "https://api.example.com", createdAt: new Date("2026-11-23T16:04:00Z") },
	{ url: "https://app.example.com", createdAt: new Date("2026-11-22T03:15:00Z") },
	{ url: "tcp://1.tcp.ngrok.io:20012", createdAt: new Date("2026-10-30T22:48:00Z") },
];

/** The first example on the Time Zone docs page. */
export function OverviewExample() {
	return (
		<PreviewCanvas>
			<TimeZoneProvider timeZone={undefined}>
				<Table.Root>
					<Table.Element>
						<Table.Head>
							<Table.Row>
								<Table.Header>Endpoint</Table.Header>
								<Table.Header>Created</Table.Header>
							</Table.Row>
						</Table.Head>
						<Table.Body>
							{endpoints.map((endpoint) => (
								<Table.Row key={endpoint.url}>
									<Table.Cell className="font-mono">{endpoint.url}</Table.Cell>
									<Table.Cell>
										<LocalTime date={endpoint.createdAt} />
									</Table.Cell>
								</Table.Row>
							))}
						</Table.Body>
					</Table.Element>
				</Table.Root>
			</TimeZoneProvider>
		</PreviewCanvas>
	);
}

/** The "Format" example on the Time Zone docs page. */
export function FormatExample() {
	return (
		<PreviewCanvas>
			<TimeZoneProvider timeZone={undefined}>
				<LocalTime
					date={new Date("2026-11-23T16:04:00Z")}
					format={{ dateStyle: "full", timeStyle: "long" }}
				/>
			</TimeZoneProvider>
		</PreviewCanvas>
	);
}
