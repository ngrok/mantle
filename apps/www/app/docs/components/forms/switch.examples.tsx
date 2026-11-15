import { Button } from "@ngrok/mantle/button";
import { Choice } from "@ngrok/mantle/choice";
import { Field, toErrorMessages } from "@ngrok/mantle/field";
import { Label } from "@ngrok/mantle/label";
import { Switch } from "@ngrok/mantle/switch";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";

import { PreviewCanvas } from "~/components/preview-canvas";

export const formSchema = z.object({
	airplaneMode: z.boolean(),
});

export function FormExample() {
	const defaultValues = {
		airplaneMode: false,
	};
	const form = useForm({
		defaultValues,
		validators: {
			onSubmit: formSchema,
		},
		onSubmit: ({ value }) => {
			window.alert(`Form submitted: ${JSON.stringify(value, null, 2)}`);
		},
	});

	return (
		<form
			className="space-y-4 w-full"
			onSubmit={(event) => {
				event.preventDefault();
				event.stopPropagation();
				void form.handleSubmit();
			}}
		>
			<form.Field name="airplaneMode">
				{(field) => (
					<Field.Item name={field.name}>
						<Field.Label className="inline-flex items-center gap-2">
							Airplane mode
							<Field.Control>
								<Switch
									checked={field.state.value}
									onBlur={field.handleBlur}
									onCheckedChange={(value) => field.handleChange(value)}
								/>
							</Field.Control>
						</Field.Label>
						<Field.Errors messages={toErrorMessages(field.state.meta.errors)} />
					</Field.Item>
				)}
			</form.Field>
			<Button type="submit" appearance="filled" intent="neutral">
				Submit
			</Button>
		</form>
	);
}

/** The first example on the Switch docs page. */
export function OverviewExample() {
	return (
		<PreviewCanvas>
			<Field.Item name="airplane-mode-field">
				<Field.Label className="inline-flex items-center gap-2">
					<Field.Control>
						<Switch />
					</Field.Control>
					Airplane mode
				</Field.Label>
				<Field.Description>Disables wireless radios while in flight.</Field.Description>
			</Field.Item>
		</PreviewCanvas>
	);
}

/** The "Without a Field" example on the Switch docs page. */
export function WithoutAFieldExample() {
	return (
		<PreviewCanvas className="grid place-items-center">
			<div className="flex flex-col gap-6">
				<Label htmlFor="airplane-mode" className="self-start inline-flex items-center gap-2">
					Airplane mode
					<Switch id="airplane-mode" />
				</Label>
				<Label htmlFor="unchecked" className="self-start inline-flex items-center gap-2">
					<Switch checked={false} id="unchecked" readOnly />
					<p>Unchecked (readonly)</p>
				</Label>
				<Label htmlFor="checked" className="self-start inline-flex items-center gap-2">
					<Switch checked={true} id="checked" readOnly />
					<p>Checked (readonly)</p>
				</Label>
				<Label
					htmlFor="airplane-mode-disabled-unchecked"
					className="self-start inline-flex items-center gap-2"
				>
					<Switch disabled id="airplane-mode-disabled-unchecked" readOnly />
					<p>Airplane Mode Disabled Unchecked (readonly)</p>
				</Label>
				<Label
					htmlFor="airplane-mode-disabled-checked"
					className="self-start inline-flex items-center gap-2"
				>
					<Switch checked disabled id="airplane-mode-disabled-checked" readOnly />
					<p>Airplane Mode Disabled Checked (readonly)</p>
				</Label>
			</div>
		</PreviewCanvas>
	);
}

/** The "Multi-line label with description" example on the Switch docs page. */
export function MultiLineLabelWithDescriptionExample() {
	return (
		<PreviewCanvas>
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
		</PreviewCanvas>
	);
}

/** The "Inside a Field" example on the Switch docs page. */
export function InsideAFieldExample() {
	return (
		<PreviewCanvas>
			<div className="w-full max-w-md">
				<Field.Item name="email-notifications">
					<Field.Control>
						<Choice.Root>
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
					</Field.Control>
					<Field.Description>You can fine-tune which events notify you later.</Field.Description>
				</Field.Item>
			</div>
		</PreviewCanvas>
	);
}

/** The "Switch in a form with client-side validation" example on the Switch docs page. */
export function SwitchInAFormWithClientSideValidationExample() {
	return (
		<PreviewCanvas className="flex-col w-full">
			<FormExample />
		</PreviewCanvas>
	);
}
