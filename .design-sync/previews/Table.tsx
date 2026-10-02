import { Badge, Table } from "@ngrok/mantle";

const invoices = [
	{ id: "INV-2041", status: "Paid", method: "Visa •••• 4242", amount: "$250.00" },
	{ id: "INV-2042", status: "Pending", method: "ACH transfer", amount: "$1,150.00" },
	{ id: "INV-2043", status: "Paid", method: "Mastercard •••• 8812", amount: "$350.00" },
	{ id: "INV-2044", status: "Overdue", method: "Wire transfer", amount: "$750.00" },
];

export const Invoices = () => (
	<Table.Root>
		<Table.Element>
			<Table.Caption>Invoices for the Acme Corp account.</Table.Caption>
			<Table.Head>
				<Table.Row>
					<Table.Header className="w-32">Invoice</Table.Header>
					<Table.Header>Status</Table.Header>
					<Table.Header>Method</Table.Header>
					<Table.Header className="text-right">Amount</Table.Header>
				</Table.Row>
			</Table.Head>
			<Table.Body>
				{invoices.map((invoice) => (
					<Table.Row key={invoice.id}>
						<Table.Cell className="font-medium">{invoice.id}</Table.Cell>
						<Table.Cell>{invoice.status}</Table.Cell>
						<Table.Cell>{invoice.method}</Table.Cell>
						<Table.Cell className="text-right">{invoice.amount}</Table.Cell>
					</Table.Row>
				))}
			</Table.Body>
			<Table.Foot>
				<Table.Row>
					<Table.Cell colSpan={3}>Total</Table.Cell>
					<Table.Cell className="text-right">$2,500.00</Table.Cell>
				</Table.Row>
			</Table.Foot>
		</Table.Element>
	</Table.Root>
);

const endpoints = [
	{ url: "https://api.acme.ngrok.app", type: "Cloud", region: "us-east", status: "online" },
	{ url: "https://webhooks.acme.com", type: "Agent", region: "eu-central", status: "online" },
	{ url: "tcp://5.tcp.ngrok.io:21443", type: "Agent", region: "ap-southeast", status: "offline" },
	{ url: "https://staging.acme.ngrok.dev", type: "Cloud", region: "us-west", status: "online" },
] as const;

export const Endpoints = () => (
	<Table.Root>
		<Table.Element>
			<Table.Head>
				<Table.Row>
					<Table.Header>URL</Table.Header>
					<Table.Header>Type</Table.Header>
					<Table.Header>Region</Table.Header>
					<Table.Header>Status</Table.Header>
				</Table.Row>
			</Table.Head>
			<Table.Body>
				{endpoints.map((endpoint) => (
					<Table.Row key={endpoint.url}>
						<Table.Cell className="font-mono">{endpoint.url}</Table.Cell>
						<Table.Cell>{endpoint.type}</Table.Cell>
						<Table.Cell>{endpoint.region}</Table.Cell>
						<Table.Cell>
							<Badge
								appearance="muted"
								color={endpoint.status === "online" ? "success" : "neutral"}
							>
								{endpoint.status === "online" ? "Online" : "Offline"}
							</Badge>
						</Table.Cell>
					</Table.Row>
				))}
			</Table.Body>
		</Table.Element>
	</Table.Root>
);
