import { Badge, Button, Card, CheckCircleIcon } from "@ngrok/mantle";

export const HeaderBodyFooter = () => (
	<Card.Root className="w-full max-w-md">
		<Card.Header>
			<Card.Title>api.example.com</Card.Title>
		</Card.Header>
		<Card.Body>
			<p className="text-body text-sm">
				Routes HTTPS traffic to your upstream on port 8080 with OAuth and a rate limit of 100
				requests per minute.
			</p>
		</Card.Body>
		<Card.Footer className="flex justify-end gap-2">
			<Button type="button" appearance="outlined" intent="neutral" size="sm">
				View traffic
			</Button>
			<Button type="button" appearance="filled" intent="neutral" size="sm">
				Edit policy
			</Button>
		</Card.Footer>
	</Card.Root>
);

export const BodyOnly = () => (
	<Card.Root className="w-full max-w-md">
		<Card.Body className="flex flex-col gap-1">
			<p className="text-muted text-sm">Data transfer this month</p>
			<p className="text-strong text-2xl font-medium">48.2 GB</p>
			<p className="text-muted text-xs">of 100 GB included in your plan</p>
		</Card.Body>
	</Card.Root>
);

export const HeaderAndBody = () => (
	<Card.Root className="w-full max-w-md">
		<Card.Header className="flex items-center justify-between">
			<Card.Title>Agent status</Card.Title>
			<Badge appearance="muted" color="success" icon={<CheckCircleIcon />}>
				Online
			</Badge>
		</Card.Header>
		<Card.Body>
			<dl className="grid grid-cols-2 gap-y-2 text-sm">
				<dt className="text-muted">Version</dt>
				<dd className="text-strong">3.22.1</dd>
				<dt className="text-muted">Region</dt>
				<dd className="text-strong">us-cal-1</dd>
				<dt className="text-muted">Uptime</dt>
				<dd className="text-strong">14d 6h</dd>
			</dl>
		</Card.Body>
	</Card.Root>
);

export const Elevated = () => (
	<Card.Root className="w-full max-w-md shadow-lg">
		<Card.Header>
			<Card.Title>Upgrade to Pay-as-you-go</Card.Title>
		</Card.Header>
		<Card.Body>
			<p className="text-body text-sm">
				Get custom domains, IP restrictions, and unlimited endpoints. You only pay for what you use.
			</p>
		</Card.Body>
		<Card.Footer>
			<p className="text-muted text-xs">Billed monthly. Cancel any time.</p>
		</Card.Footer>
	</Card.Root>
);
