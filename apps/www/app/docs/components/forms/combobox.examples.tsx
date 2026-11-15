import { Button } from "@ngrok/mantle/button";
import { Combobox } from "@ngrok/mantle/combobox";
import { Field, toErrorMessages } from "@ngrok/mantle/field";
import { CirclesThreePlusIcon } from "@phosphor-icons/react/CirclesThreePlus";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";

import { PreviewCanvas } from "~/components/preview-canvas";

export const formSchema = z.object({
	region: z.string().min(1, "Choose a region."),
});

export function TanStackFormExample() {
	const defaultValues = {
		region: "",
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
			<form.Field name="region">
				{(field) => (
					<Field.Item name={field.name}>
						<Field.Label>Region</Field.Label>
						<Combobox.Root
							inputValue={field.state.value}
							setInputValue={(value) => {
								field.handleChange(value);
							}}
						>
							<Field.Control>
								<Combobox.Input onBlur={field.handleBlur} placeholder="Choose a region..." />
							</Field.Control>
							<Combobox.Content>
								<Combobox.Item value="us-east-1">US East</Combobox.Item>
								<Combobox.Item value="us-west-2">US West</Combobox.Item>
								<Combobox.Item value="eu-west-1">EU West</Combobox.Item>
							</Combobox.Content>
						</Combobox.Root>
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

/** The first example on the Combobox docs page. */
export function OverviewExample() {
	return (
		<PreviewCanvas className="min-h-160">
			<Field.Item name="subdomain" className="max-w-96">
				<Field.Label>Subdomain</Field.Label>
				<Combobox.Root>
					<Field.Control>
						<Combobox.Input placeholder="Choose an ngrok subdomain..." />
					</Field.Control>
					<Combobox.Content>
						<Combobox.Group>
							<Combobox.GroupLabel>Available domains</Combobox.GroupLabel>
							<Combobox.Item value="https://${random}.ngrok.app">
								<Combobox.ItemValue />
							</Combobox.Item>
							<Combobox.Item value="https://${random}.ngrok.dev">
								<Combobox.ItemValue />
							</Combobox.Item>
							<Combobox.Item value="https://${random}.ngrok.io">
								<Combobox.ItemValue />
							</Combobox.Item>
						</Combobox.Group>
					</Combobox.Content>
				</Combobox.Root>
				<Field.Description>Start typing to filter available domains.</Field.Description>
			</Field.Item>
		</PreviewCanvas>
	);
}

/** The "Without helper text" example on the Combobox docs page. */
export function WithoutHelperTextExample() {
	return (
		<PreviewCanvas className="min-h-160 gap-2">
			<Field.Item name="subdomain-standalone" className="max-w-96">
				<Field.Label>Subdomain</Field.Label>
				<Combobox.Root>
					<Field.Control>
						<Combobox.Input />
					</Field.Control>
					<Combobox.Content>
						<Combobox.Group>
							<Combobox.GroupLabel>Choose an ngrok subdomain</Combobox.GroupLabel>
							<Combobox.Item value="https://" disabled>
								<Combobox.ItemValue />
							</Combobox.Item>
							<Combobox.Item value="https://${random}.ngrok.app">
								<CirclesThreePlusIcon weight="duotone" className="text-accent-600" />
								<Combobox.ItemValue />
							</Combobox.Item>
							<Combobox.Item value="https://${random}.ngrok.dev">
								<Combobox.ItemValue />
							</Combobox.Item>
							<Combobox.Item value="https://${random}.ngrok.io">
								<Combobox.ItemValue />
							</Combobox.Item>
							<Combobox.Item value="https://${random}.ngrok.free">
								<Combobox.ItemValue />
							</Combobox.Item>
							<Combobox.Item value="https://${random}.ngrok.pizza">
								<Combobox.ItemValue />
							</Combobox.Item>
							<Combobox.Item value="https://${random}.ngrok.ninja">
								<Combobox.ItemValue />
							</Combobox.Item>
							<Combobox.Item value="https://${random}.ngrok.wtf">
								<Combobox.ItemValue />
							</Combobox.Item>
							<Combobox.Item value="https://${random}.ngrok.biz">
								<Combobox.ItemValue />
							</Combobox.Item>
							<Combobox.Item value="https://${random}.ngrok.online">
								<Combobox.ItemValue />
							</Combobox.Item>
							<Combobox.Item value="https://${random}.ngrok.space">
								<Combobox.ItemValue />
							</Combobox.Item>
							<Combobox.Item value="https://${random}.ngrok.tld0">
								<Combobox.ItemValue />
							</Combobox.Item>
							<Combobox.Item value="https://${random}.ngrok.tld1">
								<Combobox.ItemValue />
							</Combobox.Item>
							<Combobox.Item value="https://${random}.ngrok.tld2">
								<Combobox.ItemValue />
							</Combobox.Item>
							<Combobox.Item value="https://${random}.ngrok.tld3">
								<Combobox.ItemValue />
							</Combobox.Item>
							<Combobox.Item value="https://${random}.ngrok.tld4">
								<Combobox.ItemValue />
							</Combobox.Item>
						</Combobox.Group>
						<Combobox.Separator />
						<Combobox.Item>
							Sit dolor enim eiusmod nulla nostrud officia in magna deserunt ut ex veniam cillum.
						</Combobox.Item>
					</Combobox.Content>
				</Combobox.Root>
			</Field.Item>
		</PreviewCanvas>
	);
}

/** The "With TanStack Form" example on the Combobox docs page. */
export function WithTanstackFormExample() {
	return (
		<PreviewCanvas className="min-h-160 w-full">
			<TanStackFormExample />
		</PreviewCanvas>
	);
}

/** The "Polymorphism" example on the Combobox docs page. */
export function PolymorphismExample() {
	return (
		<PreviewCanvas className="min-h-160">
			<Combobox.Root>
				<Combobox.Input placeholder="Search links..." />
				<Combobox.Content>
					<Combobox.Item value="Dashboard" asChild>
						<a href="#dashboard">Dashboard</a>
					</Combobox.Item>
					<Combobox.Item value="Settings" asChild>
						<a href="#settings">Settings</a>
					</Combobox.Item>
				</Combobox.Content>
			</Combobox.Root>
		</PreviewCanvas>
	);
}
