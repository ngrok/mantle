import { Button } from "@ngrok/mantle/button";
import { Field, toErrorMessages } from "@ngrok/mantle/field";
import { OtpInput, REGEXP_ONLY_DIGITS } from "@ngrok/mantle/otp-input";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";

import { PreviewCanvas } from "~/components/preview-canvas";

export const formSchema = z.object({
	code: z.string().length(6, "Enter the 6-digit code."),
});

export function TanStackFormExample() {
	const defaultValues = {
		code: "",
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
			<form.Field name="code">
				{(field) => (
					<Field.Item name={field.name}>
						<Field.Label>Verification code</Field.Label>
						<Field.Control>
							<OtpInput.Root
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={field.handleChange}
								maxLength={6}
								pattern={REGEXP_ONLY_DIGITS}
							>
								<OtpInput.Group>
									<OtpInput.Slot index={0} />
									<OtpInput.Slot index={1} />
									<OtpInput.Slot index={2} />
									<OtpInput.Slot index={3} />
									<OtpInput.Slot index={4} />
									<OtpInput.Slot index={5} />
								</OtpInput.Group>
							</OtpInput.Root>
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

/** The first example on the OTP Input docs page. */
export function OverviewExample() {
	return (
		<PreviewCanvas>
			<Field.Item name="otp">
				<Field.Label>Verification code</Field.Label>
				<Field.Control>
					<OtpInput.Root maxLength={6}>
						<OtpInput.Group>
							<OtpInput.Slot index={0} />
							<OtpInput.Slot index={1} />
							<OtpInput.Slot index={2} />
							<OtpInput.Slot index={3} />
							<OtpInput.Slot index={4} />
							<OtpInput.Slot index={5} />
						</OtpInput.Group>
					</OtpInput.Root>
				</Field.Control>
				<Field.Description>Enter the 6-digit code we emailed you.</Field.Description>
			</Field.Item>
		</PreviewCanvas>
	);
}

/** The "Without a Field" example on the OTP Input docs page. */
export function WithoutAFieldExample() {
	return (
		<PreviewCanvas>
			<OtpInput.Root aria-label="Verification code" maxLength={6}>
				<OtpInput.Group>
					<OtpInput.Slot index={0} />
					<OtpInput.Slot index={1} />
					<OtpInput.Slot index={2} />
				</OtpInput.Group>
				<OtpInput.Separator />
				<OtpInput.Group>
					<OtpInput.Slot index={3} />
					<OtpInput.Slot index={4} />
					<OtpInput.Slot index={5} />
				</OtpInput.Group>
			</OtpInput.Root>
		</PreviewCanvas>
	);
}

/** The "With TanStack Form" example on the OTP Input docs page. */
export function WithTanstackFormExample() {
	return (
		<PreviewCanvas className="w-full">
			<TanStackFormExample />
		</PreviewCanvas>
	);
}

/** The "Single group" example on the OTP Input docs page. */
export function SingleGroupExample() {
	return (
		<PreviewCanvas>
			<OtpInput.Root aria-label="Verification code" maxLength={4}>
				<OtpInput.Group>
					<OtpInput.Slot index={0} />
					<OtpInput.Slot index={1} />
					<OtpInput.Slot index={2} />
					<OtpInput.Slot index={3} />
				</OtpInput.Group>
			</OtpInput.Root>
		</PreviewCanvas>
	);
}

/** The "Digits only" example on the OTP Input docs page. */
export function DigitsOnlyExample() {
	return (
		<PreviewCanvas>
			<OtpInput.Root aria-label="Verification code" maxLength={6} pattern={REGEXP_ONLY_DIGITS}>
				<OtpInput.Group>
					<OtpInput.Slot index={0} />
					<OtpInput.Slot index={1} />
					<OtpInput.Slot index={2} />
					<OtpInput.Slot index={3} />
					<OtpInput.Slot index={4} />
					<OtpInput.Slot index={5} />
				</OtpInput.Group>
			</OtpInput.Root>
		</PreviewCanvas>
	);
}

/** The "Disabled" example on the OTP Input docs page. */
export function DisabledExample() {
	return (
		<PreviewCanvas>
			<OtpInput.Root aria-label="Verification code" maxLength={6} disabled>
				<OtpInput.Group>
					<OtpInput.Slot index={0} />
					<OtpInput.Slot index={1} />
					<OtpInput.Slot index={2} />
				</OtpInput.Group>
				<OtpInput.Separator />
				<OtpInput.Group>
					<OtpInput.Slot index={3} />
					<OtpInput.Slot index={4} />
					<OtpInput.Slot index={5} />
				</OtpInput.Group>
			</OtpInput.Root>
		</PreviewCanvas>
	);
}

/** The "Validation" example on the OTP Input docs page. */
export function ValidationExample() {
	return (
		<PreviewCanvas className="flex-col gap-4">
			<OtpInput.Root aria-label="Verification code" maxLength={6} validation="error">
				<OtpInput.Group>
					<OtpInput.Slot index={0} />
					<OtpInput.Slot index={1} />
					<OtpInput.Slot index={2} />
				</OtpInput.Group>
				<OtpInput.Separator />
				<OtpInput.Group>
					<OtpInput.Slot index={3} />
					<OtpInput.Slot index={4} />
					<OtpInput.Slot index={5} />
				</OtpInput.Group>
			</OtpInput.Root>
			<OtpInput.Root aria-label="Verification code" maxLength={6} validation="success">
				<OtpInput.Group>
					<OtpInput.Slot index={0} />
					<OtpInput.Slot index={1} />
					<OtpInput.Slot index={2} />
				</OtpInput.Group>
				<OtpInput.Separator />
				<OtpInput.Group>
					<OtpInput.Slot index={3} />
					<OtpInput.Slot index={4} />
					<OtpInput.Slot index={5} />
				</OtpInput.Group>
			</OtpInput.Root>
			<OtpInput.Root aria-label="Verification code" maxLength={6} validation="warning">
				<OtpInput.Group>
					<OtpInput.Slot index={0} />
					<OtpInput.Slot index={1} />
					<OtpInput.Slot index={2} />
				</OtpInput.Group>
				<OtpInput.Separator />
				<OtpInput.Group>
					<OtpInput.Slot index={3} />
					<OtpInput.Slot index={4} />
					<OtpInput.Slot index={5} />
				</OtpInput.Group>
			</OtpInput.Root>
		</PreviewCanvas>
	);
}

/** The "Polymorphism" example on the OTP Input docs page. */
export function PolymorphismExample() {
	return (
		<PreviewCanvas>
			<OtpInput.Root aria-label="Verification code" maxLength={6}>
				<OtpInput.Group>
					<OtpInput.Slot index={0} />
					<OtpInput.Slot index={1} />
					<OtpInput.Slot index={2} />
				</OtpInput.Group>
				<OtpInput.Separator asChild>
					<span aria-hidden>·</span>
				</OtpInput.Separator>
				<OtpInput.Group>
					<OtpInput.Slot index={3} />
					<OtpInput.Slot index={4} />
					<OtpInput.Slot index={5} />
				</OtpInput.Group>
			</OtpInput.Root>
		</PreviewCanvas>
	);
}
