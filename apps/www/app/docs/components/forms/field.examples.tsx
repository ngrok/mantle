import { Button } from "@ngrok/mantle/button";
import { Field, toErrorMessages } from "@ngrok/mantle/field";
import { Input, PasswordInput } from "@ngrok/mantle/input";
import { RadioGroup } from "@ngrok/mantle/radio-group";
import { InfoIcon } from "@phosphor-icons/react/dist/ssr/Info";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";

import { PreviewCanvas } from "~/components/preview-canvas";

export const TanStackFormExample = () => {
	const schema = z.object({
		email: z.email("Enter a valid email."),
		password: z.string().min(12, "Must be at least 12 characters."),
	});
	const form = useForm({
		defaultValues: { email: "", password: "" },
		validators: { onChange: schema },
		onSubmit: ({ value }) => {
			window.alert(JSON.stringify(value, null, 2));
		},
	});

	return (
		<form
			className="flex w-full max-w-80 flex-col gap-4"
			onSubmit={(event) => {
				event.preventDefault();
				event.stopPropagation();
				void form.handleSubmit();
			}}
		>
			<Field.Group>
				<form.Field name="email">
					{(field) => (
						<Field.Item name={field.name}>
							<Field.Label>Email</Field.Label>
							<Field.Control>
								<Input
									type="email"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(event) => field.handleChange(event.target.value)}
								/>
							</Field.Control>
							<Field.Errors messages={toErrorMessages(field.state.meta.errors)} />
							<Field.Description>We&apos;ll never share your email.</Field.Description>
						</Field.Item>
					)}
				</form.Field>
				<form.Field name="password">
					{(field) => (
						<Field.Item name={field.name}>
							<Field.Label>Password</Field.Label>
							<Field.Control>
								<PasswordInput
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(event) => field.handleChange(event.target.value)}
								/>
							</Field.Control>
							<Field.Errors messages={toErrorMessages(field.state.meta.errors)} />
							<Field.Description>At least 12 characters.</Field.Description>
						</Field.Item>
					)}
				</form.Field>
			</Field.Group>
			<Button type="submit" appearance="filled" intent="neutral">
				Submit
			</Button>
		</form>
	);
};

export const WithoutToErrorMessagesExample = () => {
	const schema = z.object({
		email: z.email("Enter a valid email."),
	});
	const form = useForm({
		defaultValues: { email: "" },
		validators: { onChange: schema },
		onSubmit: ({ value }) => {
			window.alert(JSON.stringify(value, null, 2));
		},
	});

	return (
		<form
			className="flex w-full max-w-80 flex-col gap-4"
			onSubmit={(event) => {
				event.preventDefault();
				event.stopPropagation();
				void form.handleSubmit();
			}}
		>
			<form.Field name="email">
				{(field) => (
					<Field.Item name={field.name}>
						<Field.Label>Email</Field.Label>
						<Field.Control>
							<Input
								type="email"
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(event) => field.handleChange(event.target.value)}
							/>
						</Field.Control>
						<Field.Errors
							messages={field.state.meta.errors.map((error) =>
								typeof error === "string" ? error : error?.message,
							)}
						/>
					</Field.Item>
				)}
			</form.Field>
			<Button type="submit" appearance="filled" intent="neutral">
				Submit
			</Button>
		</form>
	);
};

/** The first example on the Field docs page. */
export function OverviewExample() {
	return (
		<PreviewCanvas className="w-full">
			<Field.Item name="username" className="max-w-80">
				<Field.Label>Username</Field.Label>
				<Field.Control>
					<Input placeholder="ada-lovelace" />
				</Field.Control>
				<Field.Description>Pick something memorable. You can change it later.</Field.Description>
			</Field.Item>
		</PreviewCanvas>
	);
}

/** The "Common mistakes" example on the Field docs page. */
export function CommonMistakesExample() {
	return (
		<PreviewCanvas className="w-full">
			<Field.Item name="recoveryCode" className="max-w-80">
				<Field.Label>Recovery code</Field.Label>
				<Field.Control>
					<Input />
				</Field.Control>
				<Field.Errors messages={["Enter a valid recovery code."]} />
				<Field.Description>This renders below the input.</Field.Description>
			</Field.Item>
		</PreviewCanvas>
	);
}

/** The "Error messages" example on the Field docs page. */
export function ErrorMessagesExample() {
	return (
		<PreviewCanvas className="w-full">
			<Field.Item name="email" className="max-w-80">
				<Field.Label>Email</Field.Label>
				<Field.Control>
					<Input type="email" defaultValue="not-an-email" />
				</Field.Control>
				<Field.Errors messages={["Enter a valid email address."]} />
				<Field.Description>We&apos;ll never share your email.</Field.Description>
			</Field.Item>
		</PreviewCanvas>
	);
}

/** The "Multiple errors" example on the Field docs page. */
export function MultipleErrorsExample() {
	return (
		<PreviewCanvas className="w-full">
			<Field.Item name="password" className="max-w-80">
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
		</PreviewCanvas>
	);
}

/** The "Manual error list" example on the Field docs page. */
export function ManualErrorListExample() {
	return (
		<PreviewCanvas className="w-full">
			<Field.Item name="username" className="max-w-80">
				<Field.Label>Username</Field.Label>
				<Field.Control>
					<Input defaultValue="a" />
				</Field.Control>
				<Field.ErrorList>
					<Field.ErrorItem>Must be at least 3 characters.</Field.ErrorItem>
					<Field.ErrorItem>Use letters, numbers, hyphens, or underscores.</Field.ErrorItem>
				</Field.ErrorList>
				<Field.Description>Pick something memorable.</Field.Description>
			</Field.Item>
		</PreviewCanvas>
	);
}

/** The "Optional fields" example on the Field docs page. */
export function OptionalFieldsExample() {
	return (
		<PreviewCanvas className="w-full">
			<Field.Item name="nickname" className="max-w-80">
				<Field.Label className="flex items-baseline gap-1">
					Nickname <Field.Optional />
				</Field.Label>
				<Field.Control>
					<Input placeholder="ada" />
				</Field.Control>
				<Field.Description>Visible on your public profile.</Field.Description>
			</Field.Item>
		</PreviewCanvas>
	);
}

/** The "Help icon next to the label" example on the Field docs page. */
export function HelpIconNextToTheLabelExample() {
	return (
		<PreviewCanvas className="w-full">
			<Field.Item name="apiKey" className="max-w-80">
				<Field.LabelRow>
					<Field.Label className="flex items-baseline gap-1">
						API key <Field.Optional />
					</Field.Label>
					<Field.Help>
						<Field.HelpTrigger label="What is an API key?" />
						<Field.HelpContent>Copy this from the ngrok dashboard.</Field.HelpContent>
					</Field.Help>
				</Field.LabelRow>
				<Field.Control>
					<Input placeholder="2A1b…" />
				</Field.Control>
				<Field.Description>You can find this in the ngrok dashboard.</Field.Description>
			</Field.Item>
		</PreviewCanvas>
	);
}

/** The "Custom help icon" example on the Field docs page. */
export function CustomHelpIconExample() {
	return (
		<PreviewCanvas className="w-full">
			<Field.Item name="webhookSecret" className="max-w-80">
				<Field.LabelRow>
					<Field.Label>Webhook secret</Field.Label>
					<Field.Help>
						<Field.HelpTrigger icon={<InfoIcon />} label="What is a webhook secret?" />
						<Field.HelpContent>
							Used to sign outbound webhook payloads so your endpoint can verify the request came
							from ngrok.
						</Field.HelpContent>
					</Field.Help>
				</Field.LabelRow>
				<Field.Control>
					<Input placeholder="whsec_…" />
				</Field.Control>
			</Field.Item>
		</PreviewCanvas>
	);
}

/** The "Multiple fields" example on the Field docs page. */
export function MultipleFieldsExample() {
	return (
		<PreviewCanvas className="w-full">
			<Field.Group className="max-w-80">
				<Field.Item name="email">
					<Field.Label>Email</Field.Label>
					<Field.Control>
						<Input type="email" placeholder="you@ngrok.com" />
					</Field.Control>
				</Field.Item>
				<Field.Item name="password">
					<Field.Label>Password</Field.Label>
					<Field.Control>
						<PasswordInput />
					</Field.Control>
					<Field.Description>At least 12 characters.</Field.Description>
				</Field.Item>
			</Field.Group>
		</PreviewCanvas>
	);
}

/** The "Radio and checkbox groups" example on the Field docs page. */
export function RadioAndCheckboxGroupsExample() {
	return (
		<PreviewCanvas className="w-full">
			<Field.Set className="max-w-80">
				<Field.Legend>Notification frequency</Field.Legend>
				<RadioGroup.Root name="frequency" defaultValue="daily">
					<RadioGroup.Item value="daily" id="field-freq-daily">
						<RadioGroup.Indicator />
						<RadioGroup.ItemContent asChild>
							<label htmlFor="field-freq-daily">Daily</label>
						</RadioGroup.ItemContent>
					</RadioGroup.Item>
					<RadioGroup.Item value="weekly" id="field-freq-weekly">
						<RadioGroup.Indicator />
						<RadioGroup.ItemContent asChild>
							<label htmlFor="field-freq-weekly">Weekly</label>
						</RadioGroup.ItemContent>
					</RadioGroup.Item>
					<RadioGroup.Item value="never" id="field-freq-never">
						<RadioGroup.Indicator />
						<RadioGroup.ItemContent asChild>
							<label htmlFor="field-freq-never">Never</label>
						</RadioGroup.ItemContent>
					</RadioGroup.Item>
				</RadioGroup.Root>
			</Field.Set>
		</PreviewCanvas>
	);
}

/** The "With TanStack Form" example on the Field docs page. */
export function WithTanstackFormExample() {
	return (
		<PreviewCanvas className="w-full">
			<TanStackFormExample />
		</PreviewCanvas>
	);
}

/** The "Without toErrorMessages" example on the Field docs page. */
export function WithoutToerrormessagesExample() {
	return (
		<PreviewCanvas className="w-full">
			<WithoutToErrorMessagesExample />
		</PreviewCanvas>
	);
}

/** The "Polymorphism" example on the Field docs page. */
export function PolymorphismExample() {
	return (
		<PreviewCanvas className="w-full">
			<Field.Item name="username" className="max-w-80">
				<Field.ErrorList asChild>
					<ol>
						<Field.ErrorItem>Fix this first.</Field.ErrorItem>
						<Field.ErrorItem>Then fix this.</Field.ErrorItem>
					</ol>
				</Field.ErrorList>
			</Field.Item>
		</PreviewCanvas>
	);
}

/** The "When not to use" example on the Field docs page. */
export function WhenNotToUseExample() {
	return (
		<PreviewCanvas className="w-full">
			<Field.Item name="owner" className="max-w-80">
				<Field.LabelText>Owner</Field.LabelText>
				<p className="text-sm">Ada Lovelace</p>
				<Field.Description>The user or service user that owns this API key.</Field.Description>
			</Field.Item>
		</PreviewCanvas>
	);
}

/** The "Field.Control" example on the Field docs page. */
export function FieldControlExample() {
	return (
		<PreviewCanvas className="w-full">
			<Field.Item name="termsAccepted" className="max-w-80">
				<Field.Control>
					{(
						// @ts-ignore
						controlProps,
					) => (
						<label className="flex items-center gap-2">
							<input type="checkbox" {...controlProps} />
							Accept the terms of service
						</label>
					)}
				</Field.Control>
				<Field.Errors messages={["You must accept the terms to continue."]} />
			</Field.Item>
		</PreviewCanvas>
	);
}

/** The "toErrorMessages" example on the Field docs page. */
export function ToerrormessagesExample() {
	return (
		<PreviewCanvas className="w-full">
			<Field.Item name="email" className="max-w-80">
				<Field.Label>Email</Field.Label>
				<Field.Control>
					<Input type="email" defaultValue="not-an-email" />
				</Field.Control>
				<Field.Errors messages={toErrorMessages(["Enter a valid email."])} />
			</Field.Item>
		</PreviewCanvas>
	);
}
