import { Accordion } from "@ngrok/mantle/accordion/native";
import { Button } from "@ngrok/mantle/button";
import { useState } from "react";

import { PreviewCanvas } from "~/components/preview-canvas";

/** The questions every example on the page renders. */
const FaqItems = () => (
	<>
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
					Yes. ngrok can validate webhook signatures from providers like Stripe, GitHub, and Slack
					at the edge before the request ever reaches your service.
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
	</>
);

/** The first example on the Accordion Native docs page. */
export function OverviewExample() {
	return (
		<PreviewCanvas className="flex-col gap-6">
			<Accordion.Root defaultValue={["dns"]} className="max-w-xl">
				<FaqItems />
			</Accordion.Root>
		</PreviewCanvas>
	);
}

/** The "One section open at a time" example on the Accordion Native docs page. */
export function OneSectionOpenAtATimeExample() {
	return (
		<PreviewCanvas className="flex-col gap-6">
			<Accordion.Root type="single" defaultValue="dns" className="max-w-xl">
				<FaqItems />
			</Accordion.Root>
		</PreviewCanvas>
	);
}

/** The "Controlled" example on the Accordion Native docs page. */
export function ControlledExample() {
	const [value, setValue] = useState("dns");
	return (
		<PreviewCanvas className="flex-col gap-3">
			<Accordion.Root type="single" value={value} onValueChange={setValue} className="max-w-xl">
				<FaqItems />
			</Accordion.Root>
			<p className="text-muted text-sm">
				Open section: <code translate="no">{value || "none"}</code>
			</p>
			<div className="flex gap-2">
				<Button
					type="button"
					appearance="outlined"
					intent="neutral"
					onClick={() => setValue("pricing")}
				>
					Open “Pricing”
				</Button>
				<Button type="button" appearance="outlined" intent="neutral" onClick={() => setValue("")}>
					Collapse all
				</Button>
			</div>
		</PreviewCanvas>
	);
}

/** The "Polymorphism" example on the Accordion Native docs page. */
export function PolymorphismExample() {
	return (
		<PreviewCanvas className="flex-col gap-6">
			<Accordion.Root asChild defaultValue={["dns"]} className="max-w-xl">
				<section aria-label="Frequently asked questions">
					<FaqItems />
				</section>
			</Accordion.Root>
		</PreviewCanvas>
	);
}
