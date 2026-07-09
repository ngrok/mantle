import { Button } from "@ngrok/mantle/button";
import { Label } from "@ngrok/mantle/label";
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
	const form = useForm({
		defaultValues: {
			favorites: ["Cherry"],
		} satisfies FormValues as FormValues,
		validators: {
			onChange: formSchema,
			onSubmit: formSchema,
		},
		onSubmit: ({ value }) => {
			window.alert(`Submitted: ${JSON.stringify(value, null, 2)}`);
		},
	});

	return (
		<Sheet.Root>
			<Sheet.Trigger asChild>
				<Button type="button" appearance="filled">
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
								<div className="space-y-1.5">
									<Label htmlFor={field.name}>Fruits</Label>
									<MultiSelect.Root
										selectedValue={field.state.value}
										setSelectedValue={field.handleChange}
										setOpen={() => {
											setSearchValue("");
										}}
									>
										<MultiSelect.Trigger
											onBlur={field.handleBlur}
											validation={field.state.meta.errors.length > 0 ? "error" : false}
										>
											<MultiSelect.TagValues />
											<MultiSelect.Input
												id={field.name}
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
									{field.state.meta.errors.map((error) => (
										<p key={error?.message} className="text-sm leading-4 text-danger-600">
											{error?.message}
										</p>
									))}
								</div>
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
								<Button type="submit" form={formId} appearance="filled" disabled={!isDirty}>
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
