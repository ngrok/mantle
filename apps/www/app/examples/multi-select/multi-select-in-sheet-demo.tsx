import { Button } from "@ngrok/mantle/button";
import { Field, toErrorMessages } from "@ngrok/mantle/field";
import { MultiSelect } from "@ngrok/mantle/multi-select";
import { Sheet } from "@ngrok/mantle/sheet";
import { useForm } from "@tanstack/react-form";
import { matchSorter } from "match-sorter";
import { useId, useMemo, useState, useTransition } from "react";
import { z } from "zod";

const fruits = ["Apple", "Banana", "Cherry", "Grapes", "Orange", "Strawberry"];
const vegetables = ["Carrot", "Cucumber", "Lettuce", "Tomato", "Zucchini"];

const formSchema = z.object({
	favorites: z.string().array().min(1, "Select at least one fruit."),
});

type FormValues = z.infer<typeof formSchema>;

export function InSheetDemo() {
	const [isPending, startTransition] = useTransition();
	const formId = useId();
	const [searchValue, setSearchValue] = useState("");
	const filteredFruits = useMemo(() => matchSorter(fruits, searchValue), [searchValue]);
	const filteredVeggies = useMemo(() => matchSorter(vegetables, searchValue), [searchValue]);
	const defaultValues: FormValues = {
		favorites: ["Cherry"],
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
		<Sheet.Root>
			<Sheet.Trigger asChild>
				<Button type="button" appearance="filled" priority="neutral">
					Assign fruits
				</Button>
			</Sheet.Trigger>
			<Sheet.Content preferredWidth="sm:max-w-[560px]">
				<Sheet.Header>
					<Sheet.TitleGroup>
						<Sheet.Title>Assign fruits</Sheet.Title>
						<Sheet.Actions>
							<Sheet.CloseIconButton />
						</Sheet.Actions>
					</Sheet.TitleGroup>
					<Sheet.Description>
						Use TanStack Form to validate and submit a multi-select inside a sheet workflow.
					</Sheet.Description>
				</Sheet.Header>
				<form
					className="contents"
					id={formId}
					onSubmit={(event) => {
						event.preventDefault();
						event.stopPropagation();
						void form.handleSubmit();
					}}
				>
					<Sheet.Body className="space-y-4">
						<form.Field name="favorites">
							{(field) => (
								<Field.Item name={field.name}>
									<Field.Label>Fruits</Field.Label>
									<Field.Control>
										<MultiSelect.Root
											selectedValue={field.state.value}
											setSelectedValue={field.handleChange}
											setOpen={() => {
												setSearchValue("");
											}}
										>
											<MultiSelect.Trigger onBlur={field.handleBlur}>
												<MultiSelect.TagValues />
												<MultiSelect.Input
													onValueChange={(value) => startTransition(() => setSearchValue(value))}
													placeholder="Select fruits and vegetables..."
												/>
											</MultiSelect.Trigger>
											<MultiSelect.Content aria-busy={isPending}>
												{filteredFruits.length > 0 && (
													<MultiSelect.Group>
														<MultiSelect.GroupLabel>Fruits</MultiSelect.GroupLabel>
														{filteredFruits.map((value) => (
															<MultiSelect.Item key={value} value={value}>
																{value}
															</MultiSelect.Item>
														))}
													</MultiSelect.Group>
												)}
												{filteredFruits.length > 0 && filteredVeggies.length > 0 && (
													<MultiSelect.Separator />
												)}
												{filteredVeggies.length > 0 && (
													<MultiSelect.Group>
														<MultiSelect.GroupLabel>Vegetables</MultiSelect.GroupLabel>
														{filteredVeggies.map((value) => (
															<MultiSelect.Item key={value} value={value}>
																{value}
															</MultiSelect.Item>
														))}
													</MultiSelect.Group>
												)}
												{filteredFruits.length === 0 && filteredVeggies.length === 0 && (
													<MultiSelect.Empty>No results found</MultiSelect.Empty>
												)}
											</MultiSelect.Content>
										</MultiSelect.Root>
									</Field.Control>
									<Field.Errors messages={toErrorMessages(field.state.meta.errors)} />
								</Field.Item>
							)}
						</form.Field>
						<p className="text-muted text-sm">
							Selected values remain visible as tags while the rest of the workflow stays in the
							sheet.
						</p>
					</Sheet.Body>
					<Sheet.Footer>
						<Sheet.Close asChild>
							<Button type="button" appearance="outlined" priority="neutral">
								Cancel
							</Button>
						</Sheet.Close>
						<form.Subscribe selector={(state) => state.isDirty}>
							{(isDirty) => (
								<Button
									type="submit"
									form={formId}
									appearance="filled"
									priority="neutral"
									disabled={!isDirty}
								>
									Save
								</Button>
							)}
						</form.Subscribe>
					</Sheet.Footer>
				</form>
			</Sheet.Content>
		</Sheet.Root>
	);
}
