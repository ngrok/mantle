import { Checkbox, Choice, Field, Label } from "@ngrok/mantle";

export const WithField = () => (
	<Field.Item name="terms-of-service">
		<Field.Label className="flex items-center gap-2">
			<Field.Control>
				<Checkbox />
			</Field.Control>
			Accept terms and conditions
		</Field.Label>
		<Field.Description>You must accept before continuing.</Field.Description>
	</Field.Item>
);

export const States = () => (
	<div className="flex flex-col gap-2">
		<Label className="flex items-center gap-2">
			<Checkbox checked={false} readOnly />
			Unchecked
		</Label>
		<Label className="flex items-center gap-2">
			<Checkbox checked readOnly />
			Checked
		</Label>
		<Label className="flex items-center gap-2">
			<Checkbox defaultChecked="indeterminate" readOnly />
			Indeterminate
		</Label>
	</div>
);

export const Disabled = () => (
	<div className="flex flex-col gap-2">
		<Label className="flex items-center gap-2">
			<Checkbox disabled checked={false} readOnly />
			<span className="opacity-50">Unchecked</span>
		</Label>
		<Label className="flex items-center gap-2">
			<Checkbox disabled checked readOnly />
			<span className="opacity-50">Checked</span>
		</Label>
		<Label className="flex items-center gap-2">
			<Checkbox disabled defaultChecked="indeterminate" readOnly />
			<span className="opacity-50">Indeterminate</span>
		</Label>
	</div>
);

export const SelectAll = () => (
	<div className="flex flex-col gap-2">
		<Label className="flex items-center gap-2">
			<Checkbox defaultChecked="indeterminate" />
			All endpoints
		</Label>
		<Label className="flex items-center gap-2 pl-6">
			<Checkbox defaultChecked />
			api.example.com
		</Label>
		<Label className="flex items-center gap-2 pl-6">
			<Checkbox defaultChecked />
			webhooks.example.com
		</Label>
		<Label className="flex items-center gap-2 pl-6">
			<Checkbox />
			staging.example.com
		</Label>
	</div>
);

export const WithDescription = () => (
	<div className="w-full max-w-md">
		<Choice.Root>
			<Choice.Indicator>
				<Checkbox defaultChecked />
			</Choice.Indicator>
			<Choice.Content>
				<Choice.Label>Mark as disposable email provider</Choice.Label>
				<Choice.Description>
					Flags this domain as a disposable or throwaway email provider.
				</Choice.Description>
			</Choice.Content>
		</Choice.Root>
	</div>
);
