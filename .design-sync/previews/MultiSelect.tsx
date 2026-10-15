import { Field, MultiSelect } from "@ngrok/mantle";

const regions = ["global", "us-cal-1", "us-ohio-1", "de-fra-1", "jp-tokyo-1", "au-syd-1"];

function RegionItems() {
	return (
		<MultiSelect.Content>
			{regions.map((value) => (
				<MultiSelect.Item key={value} value={value}>
					{value}
				</MultiSelect.Item>
			))}
		</MultiSelect.Content>
	);
}

export const WithField = () => (
	<Field.Item name="regions" className="w-96">
		<Field.Label>Regions</Field.Label>
		<Field.Control>
			<MultiSelect.Root defaultSelectedValue={["us-cal-1", "de-fra-1"]}>
				<MultiSelect.Trigger>
					<MultiSelect.TagValues />
					<MultiSelect.Input placeholder="Select regions..." />
				</MultiSelect.Trigger>
				<RegionItems />
			</MultiSelect.Root>
		</Field.Control>
		<Field.Description>Endpoints accept traffic only in these regions.</Field.Description>
	</Field.Item>
);

export const Empty = () => (
	<MultiSelect.Root>
		<MultiSelect.Trigger className="w-96">
			<MultiSelect.TagValues />
			<MultiSelect.Input aria-label="Regions" placeholder="Select regions..." />
		</MultiSelect.Trigger>
		<RegionItems />
	</MultiSelect.Root>
);

export const LockedValues = () => (
	<MultiSelect.Root defaultSelectedValue={["global", "jp-tokyo-1", "au-syd-1"]}>
		<MultiSelect.Trigger className="w-96">
			<MultiSelect.TagValues lockedValues={["global"]} />
			<MultiSelect.Input aria-label="Resolves to" placeholder="Select regions..." />
		</MultiSelect.Trigger>
		<RegionItems />
	</MultiSelect.Root>
);

export const Validation = () => (
	<div className="flex w-96 flex-col gap-3">
		<MultiSelect.Root>
			<MultiSelect.Trigger validation="error">
				<MultiSelect.TagValues />
				<MultiSelect.Input
					aria-label="Regions with error"
					placeholder="Select at least one region..."
				/>
			</MultiSelect.Trigger>
			<RegionItems />
		</MultiSelect.Root>
		<MultiSelect.Root defaultSelectedValue={["us-ohio-1"]}>
			<MultiSelect.Trigger validation="warning">
				<MultiSelect.TagValues />
				<MultiSelect.Input aria-label="Regions with warning" placeholder="Select regions..." />
			</MultiSelect.Trigger>
			<RegionItems />
		</MultiSelect.Root>
		<MultiSelect.Root defaultSelectedValue={["global"]}>
			<MultiSelect.Trigger validation="success">
				<MultiSelect.TagValues />
				<MultiSelect.Input aria-label="Regions with success" placeholder="Select regions..." />
			</MultiSelect.Trigger>
			<RegionItems />
		</MultiSelect.Root>
	</div>
);
