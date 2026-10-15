import { Choice, Field, Label, Switch } from "@ngrok/mantle";

export const WithField = () => (
	<Field.Item name="traffic-inspection">
		<Field.Label className="inline-flex items-center gap-2">
			<Field.Control>
				<Switch defaultChecked />
			</Field.Control>
			Traffic inspection
		</Field.Label>
		<Field.Description>
			Capture full request and response bodies for this endpoint.
		</Field.Description>
	</Field.Item>
);

export const States = () => (
	<div className="flex flex-col gap-3">
		<Label className="inline-flex items-center gap-2 self-start">
			<Switch checked={false} readOnly />
			Off
		</Label>
		<Label className="inline-flex items-center gap-2 self-start">
			<Switch checked readOnly />
			On
		</Label>
		<Label className="inline-flex items-center gap-2 self-start">
			<Switch disabled checked={false} readOnly />
			<span className="opacity-50">Disabled off</span>
		</Label>
		<Label className="inline-flex items-center gap-2 self-start">
			<Switch disabled checked readOnly />
			<span className="opacity-50">Disabled on</span>
		</Label>
	</div>
);

export const WithDescription = () => (
	<div className="w-full max-w-md">
		<Choice.Root name="email-notifications">
			<Choice.Indicator>
				<Switch defaultChecked />
			</Choice.Indicator>
			<Choice.Content>
				<Choice.Label>Email notifications</Choice.Label>
				<Choice.Description>
					Get notified by email when a deploy finishes or a tunnel goes offline.
				</Choice.Description>
			</Choice.Content>
		</Choice.Root>
	</div>
);

export const SettingsList = () => (
	<div className="flex w-full max-w-md flex-col gap-4">
		<Choice.Root>
			<Choice.Indicator>
				<Switch defaultChecked />
			</Choice.Indicator>
			<Choice.Content>
				<Choice.Label>Require OAuth</Choice.Label>
				<Choice.Description>
					Visitors sign in with Google before reaching your app.
				</Choice.Description>
			</Choice.Content>
		</Choice.Root>
		<Choice.Root>
			<Choice.Indicator>
				<Switch />
			</Choice.Indicator>
			<Choice.Content>
				<Choice.Label>Compress responses</Choice.Label>
				<Choice.Description>Gzip responses larger than 1 KB.</Choice.Description>
			</Choice.Content>
		</Choice.Root>
	</div>
);
