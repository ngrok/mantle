import { Field, Select } from "@ngrok/mantle";

function RegionItems() {
	return (
		<>
			<Select.Group>
				<Select.Label>Regional aliases</Select.Label>
				<Select.Item value="global">Global</Select.Item>
				<Select.Item value="united-states">United States</Select.Item>
				<Select.Item value="european-union">European Union</Select.Item>
			</Select.Group>
			<Select.Separator />
			<Select.Group>
				<Select.Label>Points of presence</Select.Label>
				<Select.Item value="us-cal-1">United States (California)</Select.Item>
				<Select.Item value="de-fra-1">European Union (Frankfurt)</Select.Item>
				<Select.Item value="jp-tokyo-1">Japan (Tokyo)</Select.Item>
			</Select.Group>
		</>
	);
}

export const WithField = () => (
	<Field.Item className="w-64" name="region">
		<Field.Label>Region</Field.Label>
		<Field.Control>
			<Select.Root defaultValue="us-cal-1">
				<Select.Trigger>
					<Select.Value placeholder="Select a region" />
				</Select.Trigger>
				<Select.Content width="trigger">
					<RegionItems />
				</Select.Content>
			</Select.Root>
		</Field.Control>
		<Field.Description>Agents connect to the nearest point of presence.</Field.Description>
	</Field.Item>
);

export const Placeholder = () => (
	<Select.Root>
		<Select.Trigger className="w-64" aria-label="Region">
			<Select.Value placeholder="Select a region" />
		</Select.Trigger>
		<Select.Content width="trigger">
			<RegionItems />
		</Select.Content>
	</Select.Root>
);

export const Validation = () => (
	<div className="flex w-64 flex-col gap-3">
		<Select.Root validation="error">
			<Select.Trigger aria-label="Region with error">
				<Select.Value placeholder="Select a region" />
			</Select.Trigger>
			<Select.Content width="trigger">
				<RegionItems />
			</Select.Content>
		</Select.Root>
		<Select.Root validation="warning" defaultValue="global">
			<Select.Trigger aria-label="Region with warning">
				<Select.Value placeholder="Select a region" />
			</Select.Trigger>
			<Select.Content width="trigger">
				<RegionItems />
			</Select.Content>
		</Select.Root>
		<Select.Root validation="success" defaultValue="de-fra-1">
			<Select.Trigger aria-label="Region with success">
				<Select.Value placeholder="Select a region" />
			</Select.Trigger>
			<Select.Content width="trigger">
				<RegionItems />
			</Select.Content>
		</Select.Root>
	</div>
);

export const Disabled = () => (
	<Field.Item className="w-64" name="plan-region">
		<Field.Label>Region</Field.Label>
		<Field.Control>
			<Select.Root defaultValue="global" disabled>
				<Select.Trigger>
					<Select.Value placeholder="Select a region" />
				</Select.Trigger>
				<Select.Content width="trigger">
					<RegionItems />
				</Select.Content>
			</Select.Root>
		</Field.Control>
		<Field.Description>Upgrade your plan to pin endpoints to a region.</Field.Description>
	</Field.Item>
);
