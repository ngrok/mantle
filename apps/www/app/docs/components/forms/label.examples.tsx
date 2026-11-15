import { Input } from "@ngrok/mantle/input";
import { Label } from "@ngrok/mantle/label";
import { useForm } from "@tanstack/react-form";
import { useId } from "react";

import { PreviewCanvas } from "~/components/preview-canvas";

export function EmailFieldExample() {
	const id = useId();
	return (
		<div className="flex flex-col gap-1.5">
			<Label htmlFor={id}>Email</Label>
			<Input id={id} type="email" />
		</div>
	);
}

export function TanStackFormExample() {
	const form = useForm({
		defaultValues: { email: "" },
		onSubmit: () => {},
	});

	return (
		<form>
			<form.Field name="email">
				{(field) => (
					<div className="flex flex-col gap-1.5">
						<Label htmlFor={field.name}>Email</Label>
						<Input
							id={field.name}
							name={field.name}
							type="email"
							value={field.state.value}
							onBlur={field.handleBlur}
							onChange={(event) => field.handleChange(event.target.value)}
						/>
					</div>
				)}
			</form.Field>
		</form>
	);
}

/** The first example on the Label docs page. */
export function OverviewExample() {
	return (
		<PreviewCanvas>
			<EmailFieldExample />
		</PreviewCanvas>
	);
}

/** The "With TanStack Form" example on the Label docs page. */
export function WithTanstackFormExample() {
	return (
		<PreviewCanvas>
			<TanStackFormExample />
		</PreviewCanvas>
	);
}

/** The "Font weight" example on the Label docs page. */
export function FontWeightExample() {
	return (
		<PreviewCanvas className="flex flex-col gap-6">
			<div className="flex flex-col gap-1.5">
				<Label htmlFor="email-fw-1">Email</Label>
				<Input id="email-fw-1" type="email" />
			</div>
			<div className="flex flex-col gap-1.5">
				<Label htmlFor="email-fw-2" className="font-bold">
					Email
				</Label>
				<Input id="email-fw-2" type="email" />
			</div>
		</PreviewCanvas>
	);
}

/** The "Label that wraps a control" example on the Label docs page. */
export function LabelThatWrapsAControlExample() {
	return (
		<PreviewCanvas>
			<Label htmlFor="email-fw-3" className="flex flex-col gap-1.5">
				<span className="font-medium">Email</span>
				<Input id="email-fw-3" type="email" />
			</Label>
		</PreviewCanvas>
	);
}

/** The "Disabled state" example on the Label docs page. */
export function DisabledStateExample() {
	return (
		<PreviewCanvas className="flex flex-col gap-6">
			<div className="flex flex-col gap-1.5">
				<Label htmlFor="name-disabled" disabled>
					Name
				</Label>
				<Input id="name-disabled" type="text" disabled value="foo" readOnly />
			</div>
			<div className="flex items-center gap-2">
				<Label htmlFor="name-disabled-inline" disabled>
					Name:
				</Label>
				<Input id="name-disabled-inline" type="text" disabled value="foo" readOnly />
			</div>
		</PreviewCanvas>
	);
}
