import { Button } from "@ngrok/mantle/button";
import { Choice } from "@ngrok/mantle/choice";
import { Field, toErrorMessages } from "@ngrok/mantle/field";
import { RadioGroup } from "@ngrok/mantle/radio-group";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";

import { PreviewCanvas } from "~/components/preview-canvas";

export const formSchema = z.object({
	density: z.string().min(1, "Choose a density."),
});

export function TanStackFormExample() {
	const defaultValues = {
		density: "",
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
			<form.Field name="density">
				{(field) => (
					<Field.Set>
						<Field.Legend>Density</Field.Legend>
						<RadioGroup.Root
							name={field.name}
							value={field.state.value}
							onChange={field.handleChange}
						>
							<RadioGroup.Item value="default">
								<RadioGroup.Indicator />
								<RadioGroup.ItemContent>Default</RadioGroup.ItemContent>
							</RadioGroup.Item>
							<RadioGroup.Item value="comfortable">
								<RadioGroup.Indicator />
								<RadioGroup.ItemContent>Comfortable</RadioGroup.ItemContent>
							</RadioGroup.Item>
							<RadioGroup.Item value="compact">
								<RadioGroup.Indicator />
								<RadioGroup.ItemContent>Compact</RadioGroup.ItemContent>
							</RadioGroup.Item>
						</RadioGroup.Root>
						<Field.Errors messages={toErrorMessages(field.state.meta.errors)} />
					</Field.Set>
				)}
			</form.Field>
			<Button type="submit" appearance="filled" intent="neutral">
				Submit
			</Button>
		</form>
	);
}

/** The first example on the Radio Group docs page. */
export function OverviewExample() {
	return (
		<PreviewCanvas>
			<Field.Set>
				<Field.Legend>Density</Field.Legend>
				<RadioGroup.Root name="density" defaultValue="compact">
					<RadioGroup.Item value="default">
						<RadioGroup.Indicator />
						<RadioGroup.ItemContent>Default</RadioGroup.ItemContent>
					</RadioGroup.Item>
					<RadioGroup.Item value="comfortable">
						<RadioGroup.Indicator />
						<RadioGroup.ItemContent>Comfortable</RadioGroup.ItemContent>
					</RadioGroup.Item>
					<RadioGroup.Item value="compact">
						<RadioGroup.Indicator />
						<RadioGroup.ItemContent>Compact</RadioGroup.ItemContent>
					</RadioGroup.Item>
				</RadioGroup.Root>
				<Field.Description>Choose the row spacing for tables.</Field.Description>
			</Field.Set>
		</PreviewCanvas>
	);
}

/** The "List" example on the Radio Group docs page. */
export function ListExample() {
	return (
		<PreviewCanvas>
			<RadioGroup.List aria-label="Density" defaultValue="comfortable" className="w-full max-w-md">
				<RadioGroup.ListItem value="default" disabled>
					<RadioGroup.Indicator />
					<RadioGroup.ItemContent>
						<p className="text-strong font-medium">Default</p>
						<p className="text-body">Standard row height for most tables.</p>
					</RadioGroup.ItemContent>
				</RadioGroup.ListItem>
				<RadioGroup.ListItem value="comfortable">
					<RadioGroup.Indicator />
					<RadioGroup.ItemContent>
						<p className="text-strong font-medium">Comfortable</p>
						<p className="text-body">More space between rows for easier scanning.</p>
					</RadioGroup.ItemContent>
				</RadioGroup.ListItem>
				<RadioGroup.ListItem value="compact">
					<RadioGroup.Indicator />
					<RadioGroup.ItemContent>
						<p className="text-strong font-medium">Compact</p>
						<p className="text-body">Less space between rows to fit more data.</p>
					</RadioGroup.ItemContent>
				</RadioGroup.ListItem>
			</RadioGroup.List>
		</PreviewCanvas>
	);
}

/** The "Cards" example on the Radio Group docs page. */
export function CardsExample() {
	return (
		<PreviewCanvas>
			<RadioGroup.Root
				aria-label="Audience"
				className="grid w-full grid-cols-1 gap-4 sm:grid-cols-3"
				defaultValue="existing"
			>
				<RadioGroup.Card className="flex" value="newsletter">
					<div className="flex-1">
						<p className="text-strong font-medium">Newsletter</p>
						<p className="text-muted mt-1">Last message sent an hour ago</p>
						<p className="mt-6 font-medium">621 users</p>
					</div>
					<RadioGroup.Indicator />
				</RadioGroup.Card>
				<RadioGroup.Card className="flex" value="existing">
					<div className="flex-1">
						<p className="text-strong font-medium">Existing customers</p>
						<p className="text-muted mt-1">Last message sent 2 weeks ago</p>
						<p className="mt-6 font-medium">1,200 users</p>
					</div>
					<RadioGroup.Indicator />
				</RadioGroup.Card>
				<RadioGroup.Card className="flex" value="trial">
					<div className="flex-1">
						<p className="text-strong font-medium">Trial users</p>
						<p className="text-muted mt-1">Last message sent 4 days ago</p>
						<p className="mt-6 font-medium">2,740 users</p>
					</div>
					<RadioGroup.Indicator />
				</RadioGroup.Card>
			</RadioGroup.Root>
		</PreviewCanvas>
	);
}

/** The "Rich option layout with Choice" example on the Radio Group docs page. */
export function RichOptionLayoutWithChoiceExample() {
	return (
		<PreviewCanvas>
			<RadioGroup.Root aria-label="Plan" defaultValue="pro" className="w-full max-w-md">
				<RadioGroup.Item value="free">
					<Choice.Root>
						<Choice.Indicator>
							<RadioGroup.Indicator />
						</Choice.Indicator>
						<Choice.Content>
							<Choice.Title>Free</Choice.Title>
							<Choice.Description>Up to 3 projects and 1 member.</Choice.Description>
						</Choice.Content>
					</Choice.Root>
				</RadioGroup.Item>
				<RadioGroup.Item value="pro">
					<Choice.Root>
						<Choice.Indicator>
							<RadioGroup.Indicator />
						</Choice.Indicator>
						<Choice.Content>
							<Choice.Title>Pro</Choice.Title>
							<Choice.Description>Unlimited projects and up to 25 members.</Choice.Description>
						</Choice.Content>
					</Choice.Root>
				</RadioGroup.Item>
			</RadioGroup.Root>
		</PreviewCanvas>
	);
}

/** The "Inside a Field.Set" example on the Radio Group docs page. */
export function InsideAFieldSetExample() {
	return (
		<PreviewCanvas>
			<Field.Set className="w-full max-w-md">
				<Field.Legend>Plan</Field.Legend>
				<RadioGroup.Root aria-label="Plan" defaultValue="pro">
					<RadioGroup.Item value="free">
						<Choice.Root>
							<Choice.Indicator>
								<RadioGroup.Indicator />
							</Choice.Indicator>
							<Choice.Content>
								<Choice.Title>Free</Choice.Title>
								<Choice.Description>Up to 3 projects and 1 member.</Choice.Description>
							</Choice.Content>
						</Choice.Root>
					</RadioGroup.Item>
					<RadioGroup.Item value="pro">
						<Choice.Root>
							<Choice.Indicator>
								<RadioGroup.Indicator />
							</Choice.Indicator>
							<Choice.Content>
								<Choice.Title>Pro</Choice.Title>
								<Choice.Description>Unlimited projects and up to 25 members.</Choice.Description>
							</Choice.Content>
						</Choice.Root>
					</RadioGroup.Item>
				</RadioGroup.Root>
			</Field.Set>
		</PreviewCanvas>
	);
}

/** The "With TanStack Form" example on the Radio Group docs page. */
export function WithTanstackFormExample() {
	return (
		<PreviewCanvas className="w-full">
			<TanStackFormExample />
		</PreviewCanvas>
	);
}
