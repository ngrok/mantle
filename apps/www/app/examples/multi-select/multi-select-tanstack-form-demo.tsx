import { Button } from "@ngrok/mantle/button";
import { Field, toErrorMessages } from "@ngrok/mantle/field";
import { MultiSelect } from "@ngrok/mantle/multi-select";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";

const fruits = ["Apple", "Banana", "Cherry", "Grapes", "Orange", "Strawberry"];

const formSchema = z.object({
	favorites: z.string().array().min(1, "Select at least one fruit."),
});

type FormValues = z.infer<typeof formSchema>;

export function TanStackFormDemo() {
	const defaultValues: FormValues = {
		favorites: [],
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
			className="w-full space-y-4"
			onSubmit={(event) => {
				event.preventDefault();
				event.stopPropagation();
				void form.handleSubmit();
			}}
		>
			<form.Field name="favorites">
				{(field) => (
					<Field.Item name={field.name}>
						<Field.Label>Favorites</Field.Label>
						<Field.Control>
							<MultiSelect.Root
								selectedValue={field.state.value}
								setSelectedValue={field.handleChange}
							>
								<MultiSelect.Trigger onBlur={field.handleBlur}>
									<MultiSelect.TagValues />
									<MultiSelect.Input placeholder="Select fruits..." />
								</MultiSelect.Trigger>
								<MultiSelect.Content>
									{fruits.map((value) => (
										<MultiSelect.Item key={value} value={value}>
											{value}
										</MultiSelect.Item>
									))}
								</MultiSelect.Content>
							</MultiSelect.Root>
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
