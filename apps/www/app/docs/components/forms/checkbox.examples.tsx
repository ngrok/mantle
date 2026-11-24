import { Button } from "@ngrok/mantle/button";
import { Checkbox, CheckboxGroup, selectAllChecked } from "@ngrok/mantle/checkbox";
import { Choice } from "@ngrok/mantle/choice";
import { Field, toErrorMessages } from "@ngrok/mantle/field";
import { Icon } from "@ngrok/mantle/icon";
import { Label } from "@ngrok/mantle/label";
import { CheckIcon } from "@phosphor-icons/react/Check";
import { useForm } from "@tanstack/react-form";
import { useState } from "react";
import { z } from "zod";

import { PreviewCanvas } from "~/components/preview-canvas";

export const formSchema = z.object({
	acceptedTerms: z.boolean().refine((value) => value, "Accept the terms to continue."),
});

export function TanStackFormExample() {
	const defaultValues = {
		acceptedTerms: false,
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
			<form.Field name="acceptedTerms">
				{(field) => (
					<Field.Item name={field.name}>
						<Field.Label className="flex items-center gap-2">
							<Field.Control>
								<Checkbox
									checked={field.state.value}
									onBlur={field.handleBlur}
									onChange={(event) => field.handleChange(event.target.checked)}
								/>
							</Field.Control>
							Accept terms and conditions
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

export function SelectAllExample() {
	const rows = ["Row 1", "Row 2", "Row 3"];
	const [selected, setSelected] = useState<Array<string>>([]);
	const allSelected = selected.length === rows.length;
	const someSelected = selected.length > 0 && !allSelected;

	return (
		<div className="flex flex-col gap-2">
			<Label className="flex items-center gap-2">
				<Checkbox
					aria-label="Select all rows"
					checked={selectAllChecked({ allSelected, someSelected })}
					onCheckedChange={(checked) => setSelected(checked ? [...rows] : [])}
				/>
				Select all
			</Label>
			{rows.map((row) => (
				<Label key={row} className="flex items-center gap-2 pl-6">
					<Checkbox
						checked={selected.includes(row)}
						onCheckedChange={(checked) =>
							setSelected((prev) =>
								checked ? [...prev, row] : prev.filter((value) => value !== row),
							)
						}
					/>
					{row}
				</Label>
			))}
		</div>
	);
}

/** The first example on the Checkbox docs page. */
export function OverviewExample() {
	return (
		<PreviewCanvas>
			<Field.Item name="terms-of-service">
				<Field.Label className="flex items-center gap-2">
					<Field.Control>
						<Checkbox />
					</Field.Control>
					Accept terms and conditions
				</Field.Label>
				<Field.Description>You must accept before continuing.</Field.Description>
			</Field.Item>
		</PreviewCanvas>
	);
}

/** The "Without a Field" example on the Checkbox docs page. */
export function WithoutAFieldExample() {
	return (
		<PreviewCanvas>
			<div className="flex flex-col">
				<Label htmlFor="terms" className="flex items-center gap-2">
					<Checkbox name="terms" id="terms" />
					Accept terms and conditions
				</Label>
				<Label htmlFor="unchecked" className="flex items-center gap-2">
					<Checkbox id="unchecked" name="unchecked" checked={false} readOnly />
					Unchecked (static)
				</Label>
				<Label htmlFor="checked" className="flex items-center gap-2">
					<Checkbox id="checked" name="checked" checked readOnly />
					Checked (static)
				</Label>
				<Label htmlFor="indeterminate" className="flex items-center gap-2">
					<Checkbox
						id="indeterminate"
						name="indeterminate"
						defaultChecked="indeterminate"
						readOnly
					/>
					Indeterminate (static)
				</Label>
				<Label htmlFor="disabled-unchecked" className="flex items-center gap-2">
					<Checkbox disabled id="disabled-unchecked" name="unchecked" checked={false} readOnly />
					<span className="opacity-50">Disabled Unchecked (static)</span>
				</Label>
				<Label htmlFor="disabled-checked" className="flex items-center gap-2">
					<Checkbox disabled id="disabled-checked" name="checked" checked readOnly />
					<span className="opacity-50">Disabled Checked (static)</span>
				</Label>
				<Label htmlFor="disabled-indeterminate" className="flex items-center gap-2">
					<Checkbox
						disabled
						id="disabled-indeterminate"
						name="indeterminate"
						defaultChecked="indeterminate"
						readOnly
					/>
					<span className="opacity-50">Disabled Indeterminate (static)</span>
				</Label>
			</div>
		</PreviewCanvas>
	);
}

/** The "Multi-line label with description" example on the Checkbox docs page. */
export function MultiLineLabelWithDescriptionExample() {
	return (
		<PreviewCanvas>
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
		</PreviewCanvas>
	);
}

/** The "Inside a Field" example on the Checkbox docs page. */
export function InsideAFieldExample() {
	return (
		<PreviewCanvas>
			<div className="w-full max-w-md">
				<Field.Item name="disposable">
					<Field.Control>
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
					</Field.Control>
					<Field.Description>Applied the next time this domain is scanned.</Field.Description>
				</Field.Item>
			</div>
		</PreviewCanvas>
	);
}

/** The "With TanStack Form" example on the Checkbox docs page. */
export function WithTanstackFormExample() {
	return (
		<PreviewCanvas className="w-full">
			<TanStackFormExample />
		</PreviewCanvas>
	);
}

/** The "Select-all helper" example on the Checkbox docs page. */
export function SelectAllHelperExample() {
	return (
		<PreviewCanvas className="w-full">
			<SelectAllExample />
		</PreviewCanvas>
	);
}

/** The sources the "Cards" examples on the Checkbox docs page ask about. */
const sources = [
	{ value: "review-site", title: "Review site", description: "G2, Capterra" },
	{ value: "ai-agent", title: "AI agent", description: "Claude, ChatGPT, etc." },
	{ value: "colleague", title: "Friend or colleague", description: "Someone you work with" },
	{ value: "search", title: "Search engine", description: "Google, Bing, etc." },
];

/** The "Cards" example on the Checkbox docs page. */
export function CardsExample() {
	return (
		<PreviewCanvas>
			<CheckboxGroup.Root
				aria-label="How did you find us?"
				className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2"
				defaultValue={["review-site"]}
				name="sources"
			>
				{sources.map((source) => (
					<CheckboxGroup.Card key={source.value} className="flex gap-3" value={source.value}>
						<CheckboxGroup.ItemContent>
							<p className="text-strong font-medium">{source.title}</p>
							<p className="text-muted mt-1">{source.description}</p>
						</CheckboxGroup.ItemContent>
						<CheckboxGroup.Indicator />
					</CheckboxGroup.Card>
				))}
			</CheckboxGroup.Root>
		</PreviewCanvas>
	);
}

/** The "Checkmark indicator" example on the Checkbox docs page. */
export function CheckmarkIndicatorExample() {
	return (
		<PreviewCanvas>
			<CheckboxGroup.Root
				aria-label="How did you find us?"
				className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2"
				defaultValue={["review-site"]}
				name="sources"
			>
				{sources.map((source) => (
					<CheckboxGroup.Card key={source.value} className="flex gap-3" value={source.value}>
						<CheckboxGroup.ItemContent>
							<p className="text-strong font-medium">{source.title}</p>
							<p className="text-muted mt-1">{source.description}</p>
						</CheckboxGroup.ItemContent>
						<CheckboxGroup.Indicator>
							<Icon
								className="text-accent-600 invisible group-has-[>input:checked]/checkbox:visible"
								svg={<CheckIcon weight="bold" />}
							/>
						</CheckboxGroup.Indicator>
					</CheckboxGroup.Card>
				))}
			</CheckboxGroup.Root>
		</PreviewCanvas>
	);
}
