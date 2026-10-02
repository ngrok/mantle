import { Field, Input, InfoIcon, PasswordInput } from "@ngrok/mantle";

export const WithDescription = () => (
	<Field.Item name="endpoint-url" className="w-80">
		<Field.Label>Endpoint URL</Field.Label>
		<Field.Control>
			<Input placeholder="https://api.example.ngrok.app" />
		</Field.Control>
		<Field.Description>The public URL your agent forwards traffic from.</Field.Description>
	</Field.Item>
);

export const WithErrors = () => (
	<Field.Item name="password" className="w-80">
		<Field.Label>Password</Field.Label>
		<Field.Control>
			<PasswordInput defaultValue="abc" />
		</Field.Control>
		<Field.Errors
			messages={[
				"Must be at least 12 characters.",
				"Must include a number.",
				"Must include a symbol.",
			]}
		/>
		<Field.Description>Use a password manager to generate one.</Field.Description>
	</Field.Item>
);

export const OptionalWithHelp = () => (
	<Field.Item name="webhook-secret" className="w-80">
		<Field.LabelRow>
			<Field.Label className="flex items-baseline gap-1">
				Webhook secret <Field.Optional />
			</Field.Label>
			<Field.Help>
				<Field.HelpTrigger icon={<InfoIcon />} label="What is a webhook secret?" />
				<Field.HelpContent>
					Used to sign outbound webhook payloads so your endpoint can verify the request came from
					ngrok.
				</Field.HelpContent>
			</Field.Help>
		</Field.LabelRow>
		<Field.Control>
			<Input placeholder="whsec_…" />
		</Field.Control>
	</Field.Item>
);

export const Group = () => (
	<Field.Group className="w-80">
		<Field.Item name="email">
			<Field.Label>Email</Field.Label>
			<Field.Control>
				<Input type="email" placeholder="you@ngrok.com" />
			</Field.Control>
		</Field.Item>
		<Field.Item name="api-key-description">
			<Field.Label>API key description</Field.Label>
			<Field.Control>
				<Input defaultValue="CI deploy key" />
			</Field.Control>
			<Field.Description>Shown in the dashboard next to the key.</Field.Description>
		</Field.Item>
	</Field.Group>
);

export const ReadOnlyValue = () => (
	<Field.Item name="owner" className="w-80">
		<Field.LabelText>Owner</Field.LabelText>
		<p className="text-sm">Ada Lovelace</p>
		<Field.Description>The user or service user that owns this API key.</Field.Description>
	</Field.Item>
);
