import { Button } from "@ngrok/mantle/button";
import { Field, toErrorMessages } from "@ngrok/mantle/field";
import { PasswordInput } from "@ngrok/mantle/input";
import { useForm } from "@tanstack/react-form";
import { useState } from "react";
import { z } from "zod";

import { PreviewCanvas } from "~/components/preview-canvas";

export function ControlledVisibilityExample() {
	const [showPassword, setShowPassword] = useState(false);

	return (
		<Field.Item className="max-w-sm" name="password-controlled">
			<Field.Label>Controlled visibility</Field.Label>
			<Field.Control>
				{(controlProps) => (
					<div className="flex flex-wrap items-center gap-2">
						<PasswordInput
							{...controlProps}
							showValue={showPassword}
							onValueVisibilityChange={setShowPassword}
						/>
						<Button
							type="button"
							appearance="outlined"
							intent="neutral"
							onClick={() => {
								setShowPassword((value) => !value);
							}}
						>
							{showPassword ? "Hide" : "Show"} Password
						</Button>
					</div>
				)}
			</Field.Control>
		</Field.Item>
	);
}

export const formSchema = z.object({
	password: z.string().min(8, "Use at least 8 characters."),
});

export function TanStackFormExample() {
	const defaultValues = {
		password: "",
	};
	const form = useForm({
		defaultValues,
		validators: {
			onSubmit: formSchema,
		},
		onSubmit: ({ value }) => {
			window.alert(`Submitted: ${JSON.stringify(value, null, 2)}`);
		},
	});

	return (
		<form
			className="w-full max-w-sm space-y-4"
			onSubmit={(event) => {
				event.preventDefault();
				event.stopPropagation();
				void form.handleSubmit();
			}}
		>
			<form.Field name="password">
				{(field) => (
					<Field.Item name={field.name}>
						<Field.Label>Password</Field.Label>
						<Field.Control>
							<PasswordInput
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(event) => field.handleChange(event.target.value)}
								autoComplete="new-password"
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

/** The first example on the Password Input docs page. */
export function OverviewExample() {
	return (
		<PreviewCanvas>
			<Field.Item className="max-w-64" name="password">
				<Field.Label>Password</Field.Label>
				<Field.Control>
					<PasswordInput autoComplete="current-password" />
				</Field.Control>
			</Field.Item>
		</PreviewCanvas>
	);
}

/** The "Validation" example on the Password Input docs page. */
export function ValidationExample() {
	return (
		<PreviewCanvas>
			<Field.Item className="max-w-64" name="password-error">
				<Field.Label>Password (error)</Field.Label>
				<Field.Control>
					<PasswordInput autoComplete="current-password" validation="error" />
				</Field.Control>
			</Field.Item>
		</PreviewCanvas>
	);
}

/** The "Without a Field" example on the Password Input docs page. */
export function WithoutAFieldExample() {
	return (
		<PreviewCanvas>
			<PasswordInput className="max-w-64" aria-label="Password" />
		</PreviewCanvas>
	);
}

/** The "Visibility state" example on the Password Input docs page. */
export function VisibilityStateExample() {
	return (
		<PreviewCanvas>
			<ControlledVisibilityExample />
		</PreviewCanvas>
	);
}

/** The "Accessibility" example on the Password Input docs page. */
export function AccessibilityExample() {
	return (
		<PreviewCanvas className="flex-col gap-4">
			<Field.Item className="max-w-64" name="password" id="login-password">
				<Field.Label>Password</Field.Label>
				<Field.Control>
					<PasswordInput autoComplete="current-password" />
				</Field.Control>
			</Field.Item>
		</PreviewCanvas>
	);
}

/** The "With TanStack Form" example on the Password Input docs page. */
export function WithTanstackFormExample() {
	return (
		<PreviewCanvas className="w-full">
			<TanStackFormExample />
		</PreviewCanvas>
	);
}
