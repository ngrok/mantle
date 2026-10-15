import { Field, InfoIcon, Input, InputCapture, MagnifyingGlassIcon } from "@ngrok/mantle";

export const WithField = () => (
	<Field.Item className="w-80" name="domain">
		<Field.Label>Domain</Field.Label>
		<Field.Control>
			<Input placeholder="api.example.com" />
		</Field.Control>
		<Field.Description>Point a CNAME record at ngrok to verify ownership.</Field.Description>
	</Field.Item>
);

export const Filled = () => (
	<Field.Item className="w-80" name="upstream">
		<Field.Label>Upstream URL</Field.Label>
		<Field.Control>
			<Input defaultValue="http://localhost:8080" />
		</Field.Control>
	</Field.Item>
);

export const Validation = () => (
	<div className="flex w-80 flex-col gap-4">
		<Field.Item name="email-error">
			<Field.Label>Email</Field.Label>
			<Field.Control>
				<Input defaultValue="ops@example" validation="error" />
			</Field.Control>
		</Field.Item>
		<Field.Item name="email-warning">
			<Field.Label>Email</Field.Label>
			<Field.Control>
				<Input defaultValue="ops@gmial.com" validation="warning" />
			</Field.Control>
		</Field.Item>
		<Field.Item name="email-success">
			<Field.Label>Email</Field.Label>
			<Field.Control>
				<Input defaultValue="ops@example.com" validation="success" />
			</Field.Control>
		</Field.Item>
	</div>
);

export const WithIcons = () => (
	<div className="flex w-80 flex-col gap-4">
		<Input aria-label="Search endpoints" placeholder="Search endpoints…">
			<MagnifyingGlassIcon />
			<InputCapture />
		</Input>
		<Input aria-label="Search agents" placeholder="Search agents…">
			<MagnifyingGlassIcon />
			<InputCapture />
			<InfoIcon />
		</Input>
	</div>
);

export const Disabled = () => (
	<Field.Item className="w-80" name="region">
		<Field.Label>Region</Field.Label>
		<Field.Control>
			<Input defaultValue="us-cal-1" disabled />
		</Field.Control>
	</Field.Item>
);
