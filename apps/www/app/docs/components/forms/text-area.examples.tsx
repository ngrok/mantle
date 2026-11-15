import { Button } from "@ngrok/mantle/button";
import { Field, toErrorMessages } from "@ngrok/mantle/field";
import { TextArea } from "@ngrok/mantle/text-area";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";

import { PreviewCanvas } from "~/components/preview-canvas";

export function FormExample() {
	const formSchema = z.object({
		feedback: z.string().trim().min(1, "Enter your feedback."),
	});
	const defaultValues = {
		feedback: "",
	};
	const form = useForm({
		defaultValues,
		validators: {
			onSubmit: formSchema,
		},
		onSubmit: ({ value }) => {
			window.alert(`Feedback submitted: ${JSON.stringify(value, null, 2)}`);
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
			<form.Field name="feedback">
				{(field) => (
					<Field.Item name={field.name}>
						<Field.Label>Feedback</Field.Label>
						<Field.Control>
							<TextArea
								onBlur={field.handleBlur}
								onChange={(event) => field.handleChange(event.target.value)}
								placeholder="Tell us about your experience…"
								value={field.state.value}
							/>
						</Field.Control>
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

/** The first example on the Text Area docs page. */
export function OverviewExample() {
	return (
		<PreviewCanvas>
			<Field.Item name="textarea-default">
				<Field.Label>Feedback</Field.Label>
				<Field.Control>
					<TextArea placeholder="Tell us about your experience…" />
				</Field.Control>
			</Field.Item>
		</PreviewCanvas>
	);
}

/** The "Appearance" example on the Text Area docs page. */
export function AppearanceExample() {
	return (
		<PreviewCanvas>
			<Field.Item name="textarea-monospaced">
				<Field.Label>Monospaced TextArea</Field.Label>
				<Field.Control>
					<TextArea appearance="monospaced" placeholder="Tell us about your experience…" />
				</Field.Control>
			</Field.Item>
		</PreviewCanvas>
	);
}

/** The "Validation" example on the Text Area docs page. */
export function ValidationExample() {
	return (
		<PreviewCanvas className="grid grid-cols-1 gap-6 sm:grid-cols-2">
			<Field.Item name="textarea-error">
				<Field.Label>Error TextArea</Field.Label>
				<Field.Control>
					<TextArea validation="error" placeholder="Tell us about your experience…" />
				</Field.Control>
			</Field.Item>
			<Field.Item name="textarea-success">
				<Field.Label>Success TextArea</Field.Label>
				<Field.Control>
					<TextArea validation="success" placeholder="Tell us about your experience…" />
				</Field.Control>
			</Field.Item>
			<Field.Item name="textarea-warning">
				<Field.Label>Warning TextArea</Field.Label>
				<Field.Control>
					<TextArea validation="warning" placeholder="Tell us about your experience…" />
				</Field.Control>
			</Field.Item>
		</PreviewCanvas>
	);
}

/** The "Without a Field" example on the Text Area docs page. */
export function WithoutAFieldExample() {
	return (
		<PreviewCanvas>
			<TextArea aria-label="Feedback" placeholder="Tell us about your experience…" />
		</PreviewCanvas>
	);
}

/** The "TextArea in a form with client-side validation" example on the Text Area docs page. */
export function TextareaInAFormWithClientSideValidationExample() {
	return (
		<PreviewCanvas className="flex-col w-full">
			<FormExample />
		</PreviewCanvas>
	);
}
