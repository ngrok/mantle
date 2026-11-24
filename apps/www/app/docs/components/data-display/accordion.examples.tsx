import { Accordion } from "@ngrok/mantle/accordion";
import { Badge } from "@ngrok/mantle/badge";
import { Button } from "@ngrok/mantle/button";
import { Card } from "@ngrok/mantle/card";
import { Separator } from "@ngrok/mantle/separator";
import { CaretRightIcon } from "@phosphor-icons/react/CaretRight";
import { PlusIcon } from "@phosphor-icons/react/Plus";
import { useState } from "react";

import { PreviewCanvas } from "~/components/preview-canvas";

export const ControlledAccordionExample = () => {
	const [value, setValue] = useState("payments");
	return (
		<div className="flex w-full flex-col gap-3">
			<Accordion.Root type="single" value={value} onValueChange={setValue} className="max-w-xl">
				<Accordion.Item value="payments">
					<Accordion.Trigger>
						Payments
						<Accordion.TriggerIcon />
					</Accordion.Trigger>
					<Accordion.Content>
						<Accordion.Body>Connect a processor and manage payouts.</Accordion.Body>
					</Accordion.Content>
				</Accordion.Item>
				<Accordion.Item value="members">
					<Accordion.Trigger>
						Members
						<Accordion.TriggerIcon />
					</Accordion.Trigger>
					<Accordion.Content>
						<Accordion.Body>Invite teammates and assign roles.</Accordion.Body>
					</Accordion.Content>
				</Accordion.Item>
			</Accordion.Root>
			<p className="text-muted text-sm">
				Open section: <code translate="no">{value || "none"}</code>
			</p>
			<div className="flex gap-2">
				<Button
					type="button"
					appearance="outlined"
					intent="neutral"
					onClick={() => setValue("members")}
				>
					Open “Members”
				</Button>
				<Button type="button" appearance="outlined" intent="neutral" onClick={() => setValue("")}>
					Collapse all
				</Button>
			</div>
		</div>
	);
};

/** The first example on the Accordion docs page. */
export function OverviewExample() {
	return (
		<PreviewCanvas className="flex-col gap-6">
			<Accordion.Root defaultValue={["dns"]} className="max-w-xl">
				<Accordion.Item value="dns">
					<Accordion.Trigger>
						How do I point my custom domain at an ngrok endpoint?
						<Accordion.TriggerIcon />
					</Accordion.Trigger>
					<Accordion.Content>
						<Accordion.Body>
							Add a CNAME record at your DNS provider that targets the CNAME value shown on your
							reserved domain, then start your tunnel with the matching{" "}
							<code translate="no">--domain</code> flag.
						</Accordion.Body>
					</Accordion.Content>
				</Accordion.Item>
				<Accordion.Item value="webhooks">
					<Accordion.Trigger>
						Can I verify inbound webhook signatures?
						<Accordion.TriggerIcon />
					</Accordion.Trigger>
					<Accordion.Content>
						<Accordion.Body>
							Yes. ngrok can validate webhook signatures from providers like Stripe, GitHub, and
							Slack at the edge before the request ever reaches your service.
						</Accordion.Body>
					</Accordion.Content>
				</Accordion.Item>
				<Accordion.Item value="pricing">
					<Accordion.Trigger>
						Is there a free tier for development?
						<Accordion.TriggerIcon />
					</Accordion.Trigger>
					<Accordion.Content>
						<Accordion.Body>
							The free plan includes ephemeral endpoints and one reserved domain: enough to demo a
							deployment or prototype an integration.
						</Accordion.Body>
					</Accordion.Content>
				</Accordion.Item>
			</Accordion.Root>
		</PreviewCanvas>
	);
}

/** The "One section open at a time" example on the Accordion docs page. */
export function OneSectionOpenAtATimeExample() {
	return (
		<PreviewCanvas className="flex-col gap-6">
			<Accordion.Root type="single" defaultValue="dns" className="max-w-xl">
				<Accordion.Item value="dns">
					<Accordion.Trigger>
						How do I point my custom domain at an ngrok endpoint?
						<Accordion.TriggerIcon />
					</Accordion.Trigger>
					<Accordion.Content>
						<Accordion.Body>
							Add a CNAME record at your DNS provider that targets the CNAME value shown on your
							reserved domain, then start your tunnel with the matching{" "}
							<code translate="no">--domain</code> flag.
						</Accordion.Body>
					</Accordion.Content>
				</Accordion.Item>
				<Accordion.Item value="webhooks">
					<Accordion.Trigger>
						Can I verify inbound webhook signatures?
						<Accordion.TriggerIcon />
					</Accordion.Trigger>
					<Accordion.Content>
						<Accordion.Body>
							Yes. ngrok can validate webhook signatures from providers like Stripe, GitHub, and
							Slack at the edge before the request ever reaches your service.
						</Accordion.Body>
					</Accordion.Content>
				</Accordion.Item>
				<Accordion.Item value="pricing">
					<Accordion.Trigger>
						Is there a free tier for development?
						<Accordion.TriggerIcon />
					</Accordion.Trigger>
					<Accordion.Content>
						<Accordion.Body>
							The free plan includes ephemeral endpoints and one reserved domain: enough to demo a
							deployment or prototype an integration.
						</Accordion.Body>
					</Accordion.Content>
				</Accordion.Item>
			</Accordion.Root>
		</PreviewCanvas>
	);
}

/** The "Multiple sections open at once" example on the Accordion docs page. */
export function MultipleSectionsOpenAtOnceExample() {
	return (
		<PreviewCanvas className="flex-col gap-6">
			<Accordion.Root type="multiple" defaultValue={["one"]} className="max-w-xl">
				<Accordion.Item value="one">
					<Accordion.Trigger>
						First section
						<Accordion.TriggerIcon />
					</Accordion.Trigger>
					<Accordion.Content>
						<Accordion.Body>This section starts expanded.</Accordion.Body>
					</Accordion.Content>
				</Accordion.Item>
				<Accordion.Item value="two">
					<Accordion.Trigger>
						Second section
						<Accordion.TriggerIcon />
					</Accordion.Trigger>
					<Accordion.Content>
						<Accordion.Body>Open me without closing the first one.</Accordion.Body>
					</Accordion.Content>
				</Accordion.Item>
			</Accordion.Root>
		</PreviewCanvas>
	);
}

/** The "Controlled" example on the Accordion docs page. */
export function ControlledExample() {
	return (
		<PreviewCanvas className="flex-col gap-6">
			<ControlledAccordionExample />
		</PreviewCanvas>
	);
}

/** The "Custom header with an inline action" example on the Accordion docs page. */
export function CustomHeaderWithAnInlineActionExample() {
	return (
		<PreviewCanvas className="flex-col gap-6">
			<Accordion.Root
				type="multiple"
				defaultValue={["on_tcp_connect", "on_http_response"]}
				className="between:mbe-2.5 between:border-b-0"
			>
				<Accordion.Item value="on_tcp_connect">
					<div className="mx-4 flex items-center gap-2">
						<Accordion.Trigger className="w-auto gap-1.5">
							<span className="font-mono text-sm font-medium">on_tcp_connect</span>
							<Badge appearance="muted" color="neutral" className="rounded-full">
								3
							</Badge>
							<Accordion.TriggerIcon />
						</Accordion.Trigger>
						<Separator orientation="horizontal" className="flex-1" />
						<Button type="button" appearance="link" intent="accent" icon={<PlusIcon />}>
							<span className="xs:inline hidden">Add rule</span>
						</Button>
					</div>
					<Accordion.Content>
						<Accordion.Body>
							<Card.Root>
								<Card.Body>Proident irure consequat Lorem incididunt ullamco.</Card.Body>
							</Card.Root>
						</Accordion.Body>
					</Accordion.Content>
				</Accordion.Item>
				<Accordion.Item value="on_http_request">
					<div className="mx-4 flex items-center gap-2">
						<Accordion.Trigger className="w-auto gap-1.5">
							<span className="font-mono text-sm font-medium">on_http_request</span>
							<Badge appearance="muted" color="neutral" className="rounded-full">
								2
							</Badge>
							<Accordion.TriggerIcon />
						</Accordion.Trigger>
						<Separator orientation="horizontal" className="flex-1" />
						<Button type="button" appearance="link" intent="accent" icon={<PlusIcon />}>
							<span className="xs:inline hidden">Add rule</span>
						</Button>
					</div>
					<Accordion.Content>
						<Accordion.Body>
							<Card.Root>
								<Card.Body>Excepteur amet laboris occaecat anim minim reprehenderit.</Card.Body>
							</Card.Root>
						</Accordion.Body>
					</Accordion.Content>
				</Accordion.Item>
				<Accordion.Item value="on_http_response">
					<div className="mx-4 flex items-center gap-2">
						<Accordion.Trigger className="w-auto gap-1.5">
							<span className="font-mono text-sm font-medium">on_http_response</span>
							<Badge appearance="muted" color="neutral" className="rounded-full">
								0
							</Badge>
							<Accordion.TriggerIcon />
						</Accordion.Trigger>
						<Separator orientation="horizontal" className="flex-1" />
						<Button type="button" appearance="link" intent="accent" icon={<PlusIcon />}>
							<span className="xs:inline hidden">Add rule</span>
						</Button>
					</div>
					<Accordion.Content>
						<Accordion.Body>
							<p className="text-center">This phase does not have any rules defined</p>
						</Accordion.Body>
					</Accordion.Content>
				</Accordion.Item>
			</Accordion.Root>
		</PreviewCanvas>
	);
}

/** The "Multi-line trigger labels" example on the Accordion docs page. */
export function MultiLineTriggerLabelsExample() {
	return (
		<PreviewCanvas className="flex-col gap-6">
			<Accordion.Root className="max-w-xs">
				<Accordion.Item value="hobbyist">
					<Accordion.Trigger>
						What happens when I run out of usage credit on Hobbyist?
						<Accordion.TriggerIcon />
					</Accordion.Trigger>
					<Accordion.Content>
						<Accordion.Body>Your billing page lists the limits for each plan.</Accordion.Body>
					</Accordion.Content>
				</Accordion.Item>
				<Accordion.Item value="rollover">
					<Accordion.Trigger>
						Does unused usage credit roll over?
						<Accordion.TriggerIcon />
					</Accordion.Trigger>
					<Accordion.Content>
						<Accordion.Body>Your billing page shows when your credit resets.</Accordion.Body>
					</Accordion.Content>
				</Accordion.Item>
			</Accordion.Root>
		</PreviewCanvas>
	);
}

/** The "Custom indicator icon" example on the Accordion docs page. */
export function CustomIndicatorIconExample() {
	return (
		<PreviewCanvas className="flex-col gap-6">
			<Accordion.Root type="single" defaultValue="logs" className="max-w-xl">
				<Accordion.Item value="logs">
					<Accordion.Trigger>
						Request logs
						<Accordion.TriggerIcon
							svg={<CaretRightIcon weight="bold" />}
							className="group-aria-expanded:rotate-90"
						/>
					</Accordion.Trigger>
					<Accordion.Content>
						<Accordion.Body>Inspect recent requests, status codes, and latency.</Accordion.Body>
					</Accordion.Content>
				</Accordion.Item>
				<Accordion.Item value="metrics">
					<Accordion.Trigger>
						Metrics
						<Accordion.TriggerIcon
							svg={<CaretRightIcon weight="bold" />}
							className="group-aria-expanded:rotate-90"
						/>
					</Accordion.Trigger>
					<Accordion.Content>
						<Accordion.Body>Track throughput and error rates over time.</Accordion.Body>
					</Accordion.Content>
				</Accordion.Item>
			</Accordion.Root>
		</PreviewCanvas>
	);
}

/** The "Polymorphism" example on the Accordion docs page. */
export function PolymorphismExample() {
	return (
		<PreviewCanvas className="flex-col gap-6">
			<Accordion.Root asChild defaultValue={["dns"]} className="max-w-xl">
				<section aria-label="Frequently asked questions">
					<Accordion.Item value="dns">
						<Accordion.Trigger>
							How do I point my custom domain at an ngrok endpoint?
							<Accordion.TriggerIcon />
						</Accordion.Trigger>
						<Accordion.Content>
							<Accordion.Body>
								Add a CNAME record at your DNS provider that targets the CNAME value shown on your
								reserved domain.
							</Accordion.Body>
						</Accordion.Content>
					</Accordion.Item>
				</section>
			</Accordion.Root>
		</PreviewCanvas>
	);
}
