import { Button } from "@ngrok/mantle/button";
import { Field, toErrorMessages } from "@ngrok/mantle/field";
import { Icon } from "@ngrok/mantle/icon";
import { Select } from "@ngrok/mantle/select";
import { GlobeHemisphereWestIcon } from "@phosphor-icons/react/GlobeHemisphereWest";
import { useForm } from "@tanstack/react-form";
import { useState } from "react";
import { z } from "zod";

import { PreviewCanvas } from "~/components/preview-canvas";

export function CustomSelectedValueDemo() {
	const [value, setValue] = useState("");

	return (
		<Select.Root value={value} onValueChange={setValue}>
			<Select.Trigger className="w-45">
				<Select.Value placeholder="Select a fruit">
					{value === "apple" ? <>🍎 Apple</> : <>🍑 Peach</>}
				</Select.Value>
			</Select.Trigger>
			<Select.Content width="trigger">
				<Select.Item value="apple">Apple</Select.Item>
				<Select.Item value="peach">Peach</Select.Item>
			</Select.Content>
		</Select.Root>
	);
}

export const formSchema = z.object({
	fruit: z.string().min(1, "Choose a fruit."),
});

export function TanStackFormExample() {
	const defaultValues = {
		fruit: "",
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
			<form.Field name="fruit">
				{(field) => (
					<Field.Item name={field.name}>
						<Field.Label>Fruit</Field.Label>
						<Field.Control>
							<Select.Root
								value={field.state.value}
								onBlur={field.handleBlur}
								onValueChange={field.handleChange}
							>
								<Select.Trigger>
									<Select.Value placeholder="Select a fruit" />
								</Select.Trigger>
								<Select.Content width="trigger">
									<Select.Item value="apple">Apple</Select.Item>
									<Select.Item value="banana">Banana</Select.Item>
									<Select.Item value="blueberry">Blueberry</Select.Item>
								</Select.Content>
							</Select.Root>
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

export const regions = [
	{ value: "us", label: "United States", host: "us.ngrok.com" },
	{ value: "eu", label: "Europe", host: "eu.ngrok.com" },
	{ value: "ap", label: "Asia Pacific", host: "ap.ngrok.com" },
	{ value: "au", label: "Australia", host: "au.ngrok.com" },
];

export function RichItemLabelsDemo() {
	const [value, setValue] = useState("us");
	const region = regions.find((candidate) => candidate.value === value);

	return (
		<Select.Root value={value} onValueChange={setValue}>
			<Select.Trigger className="w-72" aria-label="Region">
				<Select.Value placeholder="Select a region">
					{region && (
						<span className="flex items-center gap-2">
							<Icon svg={<GlobeHemisphereWestIcon />} className="size-4" />
							<span>{region.label}</span>
							<span className="text-muted text-xs" translate="no">
								{region.host}
							</span>
						</span>
					)}
				</Select.Value>
			</Select.Trigger>
			<Select.Content width="trigger">
				{regions.map((region) => (
					<Select.Item key={region.value} value={region.value} icon={<GlobeHemisphereWestIcon />}>
						<span className="flex flex-col">
							<span>{region.label}</span>
							<span className="text-muted text-xs" translate="no">
								{region.host}
							</span>
						</span>
					</Select.Item>
				))}
			</Select.Content>
		</Select.Root>
	);
}

/** The first example on the Select docs page. */
export function OverviewExample() {
	return (
		<PreviewCanvas className="min-h-160">
			<Field.Item className="max-w-64" name="fruits">
				<Field.Label>Fruits</Field.Label>
				<Field.Control>
					<Select.Root>
						<Select.Trigger>
							<Select.Value placeholder="Select a fruit" />
						</Select.Trigger>
						<Select.Content width="trigger">
							<Select.Group>
								<Select.Label>Fruits</Select.Label>
								<Select.Item value="apple">Apple</Select.Item>
								<Select.Item value="banana">Banana</Select.Item>
								<Select.Item value="blueberry">Blueberry</Select.Item>
								<Select.Item value="grapes">Grapes</Select.Item>
								<Select.Item value="pineapple">Pineapple</Select.Item>
							</Select.Group>
							<Select.Separator />
							<Select.Group>
								<Select.Label>Vegetables</Select.Label>
								<Select.Item value="carrot">Carrot</Select.Item>
								<Select.Item value="cucumber">Cucumber</Select.Item>
								<Select.Item value="lettuce">Lettuce</Select.Item>
								<Select.Item value="tomato">Tomato</Select.Item>
								<Select.Item value="zucchini">
									<p>Zucchini</p>
									<p>Ex sit voluptate incididunt pariatur velit consequat reprehenderit.</p>
								</Select.Item>
							</Select.Group>
						</Select.Content>
					</Select.Root>
				</Field.Control>
			</Field.Item>
		</PreviewCanvas>
	);
}

/** The "With TanStack Form" example on the Select docs page. */
export function WithTanstackFormExample() {
	return (
		<PreviewCanvas className="min-h-160 w-full">
			<TanStackFormExample />
		</PreviewCanvas>
	);
}

/** The "Raw usage and validation" example on the Select docs page. */
export function RawUsageAndValidationExample() {
	return (
		<PreviewCanvas className="min-h-160 flex-col gap-4">
			<Select.Root>
				<Select.Trigger className="max-w-64" aria-label="Fruit">
					<Select.Value placeholder="Select a fruit" />
				</Select.Trigger>
				<Select.Content width="trigger">
					<Select.Item value="apple">Apple</Select.Item>
					<Select.Item value="banana">Banana</Select.Item>
					<Select.Item value="blueberry">Blueberry</Select.Item>
				</Select.Content>
			</Select.Root>
			<Select.Root validation="error">
				<Select.Trigger className="max-w-64" aria-label="Fruit with error">
					<Select.Value placeholder="Select a fruit" />
				</Select.Trigger>
				<Select.Content width="trigger">
					<Select.Item value="apple">Apple</Select.Item>
					<Select.Item value="banana">Banana</Select.Item>
					<Select.Item value="blueberry">Blueberry</Select.Item>
				</Select.Content>
			</Select.Root>
			<Select.Root validation="success">
				<Select.Trigger className="max-w-64" aria-label="Fruit with success">
					<Select.Value placeholder="Select a fruit" />
				</Select.Trigger>
				<Select.Content width="trigger">
					<Select.Item value="apple">Apple</Select.Item>
					<Select.Item value="banana">Banana</Select.Item>
					<Select.Item value="blueberry">Blueberry</Select.Item>
				</Select.Content>
			</Select.Root>
			<Select.Root validation="warning">
				<Select.Trigger className="max-w-64" aria-label="Fruit with warning">
					<Select.Value placeholder="Select a fruit" />
				</Select.Trigger>
				<Select.Content width="trigger">
					<Select.Item value="apple">Apple</Select.Item>
					<Select.Item value="banana">Banana</Select.Item>
					<Select.Item value="blueberry">Blueberry</Select.Item>
				</Select.Content>
			</Select.Root>
		</PreviewCanvas>
	);
}

/** The "Custom selected value" example on the Select docs page. */
export function CustomSelectedValueExample() {
	return (
		<PreviewCanvas className="min-h-160">
			<CustomSelectedValueDemo />
		</PreviewCanvas>
	);
}

/** The "Rich item labels" example on the Select docs page. */
export function RichItemLabelsExample() {
	return (
		<PreviewCanvas className="min-h-160">
			<RichItemLabelsDemo />
		</PreviewCanvas>
	);
}

/** The "Untranslatable labels" example on the Select docs page. */
export function UntranslatableLabelsExample() {
	return (
		<PreviewCanvas className="min-h-160">
			<Select.Root defaultValue="us-east-1">
				<Select.Trigger className="w-56" aria-label="AWS region">
					<Select.Value placeholder="Select a region" />
				</Select.Trigger>
				<Select.Content width="trigger">
					<Select.Item value="us-east-1" translate="no">
						us-east-1
					</Select.Item>
					<Select.Item value="eu-west-1" translate="no">
						eu-west-1
					</Select.Item>
					<Select.Item value="ap-southeast-2" translate="no">
						ap-southeast-2
					</Select.Item>
				</Select.Content>
			</Select.Root>
		</PreviewCanvas>
	);
}
