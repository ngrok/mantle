import { Button, IconButton } from "@ngrok/mantle/button";
import { DescriptionList } from "@ngrok/mantle/description-list";
import { Panel } from "@ngrok/mantle/panel";
import { XIcon } from "@phosphor-icons/react/X";
import { PreviewCanvas } from "~/components/preview-canvas";

const endpoint = [
	["URL", "https://api.example.com"],
	["Region", "us-cal-1"],
	["Traffic policy", "rate-limit.yml"],
	["Created", "Nov 25, 2026"],
	["Owner", "ops@example.com"],
	["Requests today", "14,210"],
] as const;

/** A details pane with a title, a scroll body, and an action row. */
export function OverviewExample() {
	return (
		<PreviewCanvas>
			<Panel.Root aria-label="Endpoint details" className="h-96 w-full max-w-md">
				<Panel.Header>
					<p className="text-strong min-w-0 flex-1 truncate text-sm font-medium">
						Endpoint details
					</p>
					<IconButton
						type="button"
						appearance="ghost"
						intent="neutral"
						icon={<XIcon />}
						label="Close the details"
					/>
				</Panel.Header>
				<Panel.Body>
					<div className="p-4">
						<DescriptionList.Root>
							{endpoint.map(([term, details]) => (
								<DescriptionList.Item key={term}>
									<DescriptionList.Label>{term}</DescriptionList.Label>
									<DescriptionList.Value>{details}</DescriptionList.Value>
								</DescriptionList.Item>
							))}
						</DescriptionList.Root>
					</div>
				</Panel.Body>
				<Panel.Footer className="flex-row justify-end pt-3">
					<Button type="button" appearance="outlined" intent="neutral">
						Edit
					</Button>
				</Panel.Footer>
			</Panel.Root>
		</PreviewCanvas>
	);
}

/** `Panel.Header` on its own, as the header row of a full page. */
export function HeaderExample() {
	return (
		<PreviewCanvas>
			<div className="flex h-64 w-full flex-col">
				<Panel.Header>
					<h1 className="text-strong min-w-0 flex-1 truncate text-sm font-medium">Assistant</h1>
					<IconButton
						type="button"
						appearance="ghost"
						intent="neutral"
						icon={<XIcon />}
						label="Close the assistant"
					/>
				</Panel.Header>
				<Panel.Body>
					<p className="p-4 text-sm">Ask about your endpoints.</p>
				</Panel.Body>
			</div>
		</PreviewCanvas>
	);
}

/** A panel as a `<section>` named by its heading: a `region` landmark. */
export function PolymorphismExample() {
	return (
		<PreviewCanvas>
			<Panel.Root asChild className="h-48 w-full max-w-sm">
				<section aria-labelledby="panel-polymorphism-title">
					<Panel.Header>
						<h2
							id="panel-polymorphism-title"
							className="text-strong min-w-0 flex-1 truncate text-sm font-medium"
						>
							Recent activity
						</h2>
					</Panel.Header>
					<Panel.Body>
						<p className="p-4 text-sm">No requests in the last hour.</p>
					</Panel.Body>
				</section>
			</Panel.Root>
		</PreviewCanvas>
	);
}
