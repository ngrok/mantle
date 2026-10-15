import { Badge, CheckCircleIcon, Code, DescriptionList } from "@ngrok/mantle";

export const APIKey = () => (
	<DescriptionList.Root>
		<DescriptionList.Item>
			<DescriptionList.Label>Key</DescriptionList.Label>
			<DescriptionList.Value className="font-bold">billing-service-prod</DescriptionList.Value>
		</DescriptionList.Item>
		<DescriptionList.Item>
			<DescriptionList.Label>ID</DescriptionList.Label>
			<DescriptionList.Value>ak_2fKm9x8Hn3QpYT7zKlR0vW5</DescriptionList.Value>
		</DescriptionList.Item>
		<DescriptionList.Item>
			<DescriptionList.Label>Description</DescriptionList.Label>
			<DescriptionList.Value>Production API key for the billing service</DescriptionList.Value>
		</DescriptionList.Item>
		<DescriptionList.Item>
			<DescriptionList.Label>Created</DescriptionList.Label>
			<DescriptionList.Value>2 days ago by admin@acme.com</DescriptionList.Value>
		</DescriptionList.Item>
		<DescriptionList.Item>
			<DescriptionList.Label>Last used</DescriptionList.Label>
			<DescriptionList.Value>
				<span className="text-muted italic">Never</span>
			</DescriptionList.Value>
		</DescriptionList.Item>
	</DescriptionList.Root>
);

export const Endpoint = () => (
	<DescriptionList.Root>
		<DescriptionList.Item>
			<DescriptionList.Label>URL</DescriptionList.Label>
			<DescriptionList.Value asChild>
				<a href="https://api.acme.ngrok.app">https://api.acme.ngrok.app</a>
			</DescriptionList.Value>
		</DescriptionList.Item>
		<DescriptionList.Item>
			<DescriptionList.Label>Status</DescriptionList.Label>
			<DescriptionList.Value>
				<Badge appearance="muted" color="success" icon={<CheckCircleIcon />}>
					Online
				</Badge>
			</DescriptionList.Value>
		</DescriptionList.Item>
		<DescriptionList.Item>
			<DescriptionList.Label>Upstream</DescriptionList.Label>
			<DescriptionList.Value>
				<Code>http://localhost:8080</Code>
			</DescriptionList.Value>
		</DescriptionList.Item>
		<DescriptionList.Item>
			<DescriptionList.Label>Region</DescriptionList.Label>
			<DescriptionList.Value>us-east (Virginia)</DescriptionList.Value>
		</DescriptionList.Item>
		<DescriptionList.Item>
			<DescriptionList.Label>Traffic Policy</DescriptionList.Label>
			<DescriptionList.Value>rate-limit, oauth</DescriptionList.Value>
		</DescriptionList.Item>
	</DescriptionList.Root>
);
