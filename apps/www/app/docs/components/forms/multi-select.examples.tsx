import { Field } from "@ngrok/mantle/field";
import { MultiSelect } from "@ngrok/mantle/multi-select";
import { matchSorter } from "match-sorter";
import { useMemo, useState, useTransition } from "react";

import { InSheetDemo } from "~/examples/multi-select/multi-select-in-sheet-demo";
import { RegionPinningDemo } from "~/examples/multi-select/multi-select-region-pinning-demo";
import { TanStackFormDemo } from "~/examples/multi-select/multi-select-tanstack-form-demo";
import { PreviewCanvas } from "~/components/preview-canvas";

export const fruits = [
	"Apple",
	"Banana",
	"Blueberry",
	"Cherry",
	"Grapes",
	"Kiwi",
	"Lemon",
	"Mango",
	"Orange",
	"Peach",
	"Pear",
	"Pineapple",
	"Strawberry",
	"Watermelon",
];

export function BasicDemo() {
	const [isPending, startTransition] = useTransition();
	const [searchValue, setSearchValue] = useState("");
	const matches = useMemo(() => matchSorter(fruits, searchValue), [searchValue]);

	return (
		<Field.Item name="fruits" className="max-w-96">
			<Field.Label>Fruits</Field.Label>
			<Field.Control>
				<MultiSelect.Root
					setOpen={() => {
						setSearchValue("");
					}}
				>
					<MultiSelect.Trigger>
						<MultiSelect.TagValues />
						<MultiSelect.Input
							onValueChange={(value) => startTransition(() => setSearchValue(value))}
							placeholder="Select fruits..."
						/>
					</MultiSelect.Trigger>
					<MultiSelect.Content aria-busy={isPending}>
						{matches.map((value) => (
							<MultiSelect.Item key={value} value={value}>
								{value}
							</MultiSelect.Item>
						))}
						{matches.length === 0 && <MultiSelect.Empty>No results found</MultiSelect.Empty>}
					</MultiSelect.Content>
				</MultiSelect.Root>
			</Field.Control>
		</Field.Item>
	);
}

const fruitList = ["Apple", "Banana", "Cherry", "Grapes", "Orange", "Strawberry"];
const veggieList = ["Carrot", "Cucumber", "Lettuce", "Tomato", "Zucchini"];

export function GroupedDemo() {
	const [isPending, startTransition] = useTransition();
	const [searchValue, setSearchValue] = useState("");
	const filteredFruits = useMemo(() => matchSorter(fruitList, searchValue), [searchValue]);
	const filteredVeggies = useMemo(() => matchSorter(veggieList, searchValue), [searchValue]);

	return (
		<Field.Item name="produce" className="max-w-96">
			<Field.Label>Produce</Field.Label>
			<Field.Control>
				<MultiSelect.Root
					setOpen={() => {
						setSearchValue("");
					}}
				>
					<MultiSelect.Trigger>
						<MultiSelect.TagValues />
						<MultiSelect.Input
							onValueChange={(value) => startTransition(() => setSearchValue(value))}
							placeholder="Select items..."
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
						{filteredFruits.length > 0 && filteredVeggies.length > 0 && <MultiSelect.Separator />}
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
		</Field.Item>
	);
}

export function ControlledDemo() {
	const [isPending, startTransition] = useTransition();
	const [searchValue, setSearchValue] = useState("");
	const [selected, setSelected] = useState(["Apple", "Cherry"]);
	const matches = useMemo(() => matchSorter(fruits, searchValue), [searchValue]);

	return (
		<Field.Item name="fruits-controlled" className="max-w-96">
			<Field.Label>Fruits</Field.Label>
			<Field.Control>
				<MultiSelect.Root
					selectedValue={selected}
					setOpen={() => {
						setSearchValue("");
					}}
					setSelectedValue={setSelected}
				>
					<MultiSelect.Trigger>
						<MultiSelect.TagValues />
						<MultiSelect.Input
							onValueChange={(value) => startTransition(() => setSearchValue(value))}
							placeholder="Select fruits..."
						/>
					</MultiSelect.Trigger>
					<MultiSelect.Content aria-busy={isPending}>
						{matches.map((value) => (
							<MultiSelect.Item key={value} value={value}>
								{value}
							</MultiSelect.Item>
						))}
						{matches.length === 0 && <MultiSelect.Empty>No results found</MultiSelect.Empty>}
					</MultiSelect.Content>
				</MultiSelect.Root>
			</Field.Control>
		</Field.Item>
	);
}

export function CreatableDemo() {
	const [isPending, startTransition] = useTransition();
	const [searchValue, setSearchValue] = useState("");
	const [selected, setSelected] = useState(["Apple", "Cherry"]);
	const [options, setOptions] = useState(fruits);
	const matches = useMemo(() => matchSorter(options, searchValue), [options, searchValue]);
	const showCreate =
		searchValue.trim() !== "" &&
		!options.some((o) => o.toLowerCase() === searchValue.trim().toLowerCase());

	return (
		<Field.Item name="fruits-creatable" className="max-w-96">
			<Field.Label>Fruits</Field.Label>
			<Field.Control>
				<MultiSelect.Root
					selectedValue={selected}
					setOpen={() => {
						setSearchValue("");
					}}
					setSelectedValue={(values) => {
						setSelected(values);
						startTransition(() => setSearchValue(""));
					}}
				>
					<MultiSelect.Trigger>
						<MultiSelect.TagValues />
						<MultiSelect.Input
							onValueChange={(value) => startTransition(() => setSearchValue(value))}
							placeholder="Select or create fruits..."
						/>
					</MultiSelect.Trigger>
					<MultiSelect.Content aria-busy={isPending}>
						{matches.map((value) => (
							<MultiSelect.Item key={value} value={value}>
								{value}
							</MultiSelect.Item>
						))}
						{showCreate && (
							<MultiSelect.Item
								value={searchValue.trim()}
								onClick={() => setOptions((prev) => [...prev, searchValue.trim()])}
							>
								Create &quot;{searchValue.trim()}&quot;
							</MultiSelect.Item>
						)}
						{matches.length === 0 && !showCreate && (
							<MultiSelect.Empty>No results found</MultiSelect.Empty>
						)}
					</MultiSelect.Content>
				</MultiSelect.Root>
			</Field.Control>
		</Field.Item>
	);
}

export function LockedValuesDemo() {
	const [isPending, startTransition] = useTransition();
	const [searchValue, setSearchValue] = useState("");
	const [selected, setSelected] = useState(["apple", "banana", "cherry"]);
	const matches = useMemo(
		() =>
			["apple", "banana", "cherry", "grape", "kiwi", "mango"].filter((f) =>
				f.includes(searchValue.toLowerCase()),
			),
		[searchValue],
	);

	return (
		<Field.Item name="fruits-locked" className="max-w-96">
			<Field.Label>Fruits</Field.Label>
			<Field.Control>
				<MultiSelect.Root
					selectedValue={selected}
					setOpen={() => {
						setSearchValue("");
					}}
					setSelectedValue={setSelected}
				>
					<MultiSelect.Trigger>
						<MultiSelect.TagValues lockedValues={["apple", "cherry"]} />
						<MultiSelect.Input
							onValueChange={(value) => startTransition(() => setSearchValue(value))}
							placeholder="Select fruits..."
						/>
					</MultiSelect.Trigger>
					<MultiSelect.Content aria-busy={isPending}>
						{matches.map((value) => (
							<MultiSelect.Item key={value} value={value}>
								{value}
							</MultiSelect.Item>
						))}
						{matches.length === 0 && <MultiSelect.Empty>No results found</MultiSelect.Empty>}
					</MultiSelect.Content>
				</MultiSelect.Root>
			</Field.Control>
		</Field.Item>
	);
}

export function ValidationDemo() {
	const [isPending, startTransition] = useTransition();
	const [searchValue, setSearchValue] = useState("");
	const matches = useMemo(() => matchSorter(fruits, searchValue), [searchValue]);

	return (
		<div className="flex w-full max-w-96 flex-col gap-4">
			<Field.Item name="fruits-error">
				<Field.Label>Fruits (error)</Field.Label>
				<Field.Control>
					<MultiSelect.Root
						setOpen={() => {
							setSearchValue("");
						}}
					>
						<MultiSelect.Trigger validation="error">
							<MultiSelect.TagValues />
							<MultiSelect.Input
								onValueChange={(value) => startTransition(() => setSearchValue(value))}
								placeholder="Error state..."
							/>
						</MultiSelect.Trigger>
						<MultiSelect.Content aria-busy={isPending}>
							{matches.map((value) => (
								<MultiSelect.Item key={value} value={value}>
									{value}
								</MultiSelect.Item>
							))}
						</MultiSelect.Content>
					</MultiSelect.Root>
				</Field.Control>
			</Field.Item>
			<Field.Item name="fruits-success">
				<Field.Label>Fruits (success)</Field.Label>
				<Field.Control>
					<MultiSelect.Root
						setOpen={() => {
							setSearchValue("");
						}}
					>
						<MultiSelect.Trigger validation="success">
							<MultiSelect.TagValues />
							<MultiSelect.Input
								onValueChange={(value) => startTransition(() => setSearchValue(value))}
								placeholder="Success state..."
							/>
						</MultiSelect.Trigger>
						<MultiSelect.Content aria-busy={isPending}>
							{matches.map((value) => (
								<MultiSelect.Item key={value} value={value}>
									{value}
								</MultiSelect.Item>
							))}
						</MultiSelect.Content>
					</MultiSelect.Root>
				</Field.Control>
			</Field.Item>
			<Field.Item name="fruits-warning">
				<Field.Label>Fruits (warning)</Field.Label>
				<Field.Control>
					<MultiSelect.Root
						setOpen={() => {
							setSearchValue("");
						}}
					>
						<MultiSelect.Trigger validation="warning">
							<MultiSelect.TagValues />
							<MultiSelect.Input
								onValueChange={(value) => startTransition(() => setSearchValue(value))}
								placeholder="Warning state..."
							/>
						</MultiSelect.Trigger>
						<MultiSelect.Content aria-busy={isPending}>
							{matches.map((value) => (
								<MultiSelect.Item key={value} value={value}>
									{value}
								</MultiSelect.Item>
							))}
						</MultiSelect.Content>
					</MultiSelect.Root>
				</Field.Control>
			</Field.Item>
		</div>
	);
}

/** The first example on the Multi Select docs page. */
export function OverviewExample() {
	return (
		<PreviewCanvas className="min-h-160">
			<Field.Item name="fruits" className="max-w-96">
				<Field.Label>Fruits</Field.Label>
				<Field.Control>
					<MultiSelect.Root>
						<MultiSelect.Trigger>
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
				<Field.Description>Pick one or more.</Field.Description>
			</Field.Item>
		</PreviewCanvas>
	);
}

/** The "Without a Field" example on the Multi Select docs page. */
export function WithoutAFieldExample() {
	return (
		<PreviewCanvas className="min-h-160">
			<BasicDemo />
		</PreviewCanvas>
	);
}

/** The "Controlled" example on the Multi Select docs page. */
export function ControlledExample() {
	return (
		<PreviewCanvas className="min-h-160">
			<ControlledDemo />
		</PreviewCanvas>
	);
}

/** The "In a Sheet" example on the Multi Select docs page. */
export function InASheetExample() {
	return (
		<PreviewCanvas className="min-h-160">
			<InSheetDemo />
		</PreviewCanvas>
	);
}

/** The "Locked values" example on the Multi Select docs page. */
export function LockedValuesExample() {
	return (
		<PreviewCanvas className="min-h-160">
			<LockedValuesDemo />
		</PreviewCanvas>
	);
}

/** The "Creatable" example on the Multi Select docs page. */
export function CreatableExample() {
	return (
		<PreviewCanvas className="min-h-160">
			<CreatableDemo />
		</PreviewCanvas>
	);
}

/** The "With groups" example on the Multi Select docs page. */
export function WithGroupsExample() {
	return (
		<PreviewCanvas className="min-h-160">
			<GroupedDemo />
		</PreviewCanvas>
	);
}

/** The "With TanStack Form" example on the Multi Select docs page. */
export function WithTanstackFormExample() {
	return (
		<PreviewCanvas className="min-h-160 w-full">
			<TanStackFormDemo />
		</PreviewCanvas>
	);
}

/** The "Validation states" example on the Multi Select docs page. */
export function ValidationStatesExample() {
	return (
		<PreviewCanvas className="min-h-160">
			<ValidationDemo />
		</PreviewCanvas>
	);
}

/** The "Region pinning" example on the Multi Select docs page. */
export function RegionPinningExample() {
	return (
		<PreviewCanvas className="min-h-160">
			<RegionPinningDemo />
		</PreviewCanvas>
	);
}
