import { Accordion, Code } from "@ngrok/mantle";

export const Multiple = () => (
	<Accordion.Root defaultValue={["dns"]} className="w-full max-w-xl">
		<Accordion.Item value="dns">
			<Accordion.Trigger>
				How do I point my custom domain at an ngrok endpoint?
				<Accordion.TriggerIcon />
			</Accordion.Trigger>
			<Accordion.Content>
				<Accordion.Body>
					Add a CNAME record at your DNS provider that targets the value shown on your reserved
					domain. Then start the agent with <Code>--url https://api.acme.com</Code>.
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
					Yes. The verify-webhook action checks signatures from Stripe, GitHub, and Slack before the
					request reaches your service.
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
					The free plan includes one static domain and ephemeral endpoints.
				</Accordion.Body>
			</Accordion.Content>
		</Accordion.Item>
	</Accordion.Root>
);

export const Single = () => (
	<Accordion.Root type="single" defaultValue="rate-limit" className="w-full max-w-xl">
		<Accordion.Item value="rate-limit">
			<Accordion.Trigger>
				Rate limiting
				<Accordion.TriggerIcon />
			</Accordion.Trigger>
			<Accordion.Content>
				<Accordion.Body>
					Allow 100 requests per minute per client IP. Requests over the limit get a{" "}
					<Code>429</Code> response.
				</Accordion.Body>
			</Accordion.Content>
		</Accordion.Item>
		<Accordion.Item value="oauth">
			<Accordion.Trigger>
				OAuth
				<Accordion.TriggerIcon />
			</Accordion.Trigger>
			<Accordion.Content>
				<Accordion.Body>
					Require a Google sign-in before traffic reaches the upstream.
				</Accordion.Body>
			</Accordion.Content>
		</Accordion.Item>
		<Accordion.Item value="headers">
			<Accordion.Trigger>
				Header rewrites
				<Accordion.TriggerIcon />
			</Accordion.Trigger>
			<Accordion.Content>
				<Accordion.Body>Add or remove request and response headers at the edge.</Accordion.Body>
			</Accordion.Content>
		</Accordion.Item>
	</Accordion.Root>
);

export const Collapsed = () => (
	<Accordion.Root type="single" className="w-full max-w-xl">
		<Accordion.Item value="agents">
			<Accordion.Trigger>
				Agents
				<Accordion.TriggerIcon />
			</Accordion.Trigger>
			<Accordion.Content>
				<Accordion.Body>3 agents online in us-east and eu-central.</Accordion.Body>
			</Accordion.Content>
		</Accordion.Item>
		<Accordion.Item value="endpoints">
			<Accordion.Trigger>
				Endpoints
				<Accordion.TriggerIcon />
			</Accordion.Trigger>
			<Accordion.Content>
				<Accordion.Body>12 cloud endpoints and 4 agent endpoints.</Accordion.Body>
			</Accordion.Content>
		</Accordion.Item>
	</Accordion.Root>
);
