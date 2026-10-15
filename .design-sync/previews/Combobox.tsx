import { CirclesThreePlusIcon, Combobox, Field } from "@ngrok/mantle";

const domains = [
	"https://api.ngrok.app",
	"https://api.ngrok.dev",
	"https://api.ngrok.io",
	"https://api.ngrok.pizza",
];

function DomainItems() {
	return (
		<Combobox.Group>
			<Combobox.GroupLabel>Available domains</Combobox.GroupLabel>
			{domains.map((domain) => (
				<Combobox.Item key={domain} value={domain}>
					<Combobox.ItemValue />
				</Combobox.Item>
			))}
		</Combobox.Group>
	);
}

export const WithField = () => (
	<Field.Item name="subdomain" className="w-80">
		<Field.Label>Subdomain</Field.Label>
		<Combobox.Root>
			<Field.Control>
				<Combobox.Input placeholder="Choose an ngrok subdomain..." />
			</Field.Control>
			<Combobox.Content>
				<DomainItems />
			</Combobox.Content>
		</Combobox.Root>
		<Field.Description>Start typing to filter available domains.</Field.Description>
	</Field.Item>
);

export const Filled = () => (
	<Field.Item name="domain" className="w-80">
		<Field.Label>Domain</Field.Label>
		<Combobox.Root defaultValue="https://api.ngrok.app">
			<Field.Control>
				<Combobox.Input />
			</Field.Control>
			<Combobox.Content>
				<DomainItems />
			</Combobox.Content>
		</Combobox.Root>
	</Field.Item>
);

export const Validation = () => (
	<Field.Item name="reserved-domain" className="w-80">
		<Field.Label>Domain</Field.Label>
		<Combobox.Root defaultValue="https://api.ngrok.wtf">
			<Field.Control>
				<Combobox.Input validation="error" />
			</Field.Control>
			<Combobox.Content>
				<DomainItems />
			</Combobox.Content>
		</Combobox.Root>
		<Field.Errors messages={["Pick a domain from the list."]} />
	</Field.Item>
);

export const OpenList = () => (
	<div className="h-64 w-80">
		<Combobox.Root defaultOpen>
			<Combobox.Input aria-label="Domain" placeholder="Choose an ngrok subdomain..." />
			<Combobox.Content>
				<Combobox.Group>
					<Combobox.GroupLabel>Available domains</Combobox.GroupLabel>
					<Combobox.Item value="https://api.ngrok.app">
						<CirclesThreePlusIcon weight="duotone" className="text-accent-600" />
						<Combobox.ItemValue />
					</Combobox.Item>
					<Combobox.Item value="https://api.ngrok.dev">
						<Combobox.ItemValue />
					</Combobox.Item>
					<Combobox.Item value="https://api.ngrok.io" disabled>
						<Combobox.ItemValue />
					</Combobox.Item>
				</Combobox.Group>
			</Combobox.Content>
		</Combobox.Root>
	</div>
);
