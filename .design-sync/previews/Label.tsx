import { Checkbox, Input, Label } from "@ngrok/mantle";

export const WithInput = () => (
	<div className="flex w-80 flex-col gap-1.5">
		<Label htmlFor="label-email">Email</Label>
		<Input id="label-email" type="email" placeholder="you@example.com" />
	</div>
);

export const Inline = () => (
	<div className="flex w-full max-w-sm items-center gap-2">
		<Label htmlFor="label-domain" className="shrink-0">
			Domain:
		</Label>
		<Input id="label-domain" defaultValue="api.example.com" />
	</div>
);

export const WrappingControl = () => (
	<Label className="flex items-center gap-2">
		<Checkbox defaultChecked />
		Forward traffic to localhost:3000
	</Label>
);

export const Disabled = () => (
	<div className="flex w-80 flex-col gap-1.5">
		<Label htmlFor="label-region" disabled>
			Region
		</Label>
		<Input id="label-region" disabled readOnly value="us-cal-1" />
	</div>
);
