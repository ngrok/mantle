import { RadioGroup } from "@ngrok/mantle/radio-group";
import { SegmentedControl } from "@ngrok/mantle/segmented-control";
import { RadioGroup as MantleRadioGroup } from "@ngrok/mantle/radio-group";
// An aliased import does not supply the name the rules write.
import { SegmentedControl as MantleSegmentedControl } from "@ngrok/mantle/segmented-control";
import { RadioGroup as OtherRadioGroup } from "@acme/ui";
import type { ComponentProps } from "react";

// A type query on the old part.
export type ViewProps = ComponentProps<typeof SegmentedControl.Root>;

export const Environment = (
	<SegmentedControl.Root aria-label="Environment" defaultValue="production">
		<SegmentedControl.Item value="development">Dev</SegmentedControl.Item>
		<SegmentedControl.Item value="staging" disabled>
			Staging
		</SegmentedControl.Item>
		<SegmentedControl.Item value="production">Prod</SegmentedControl.Item>
	</SegmentedControl.Root>
);

// A self-closing segment, and the plain radios a file keeps beside it.
export const Mixed = (
	<>
		<SegmentedControl.Root aria-label="Size" defaultValue="small">
			<SegmentedControl.Item value="small" aria-label="Small" />
		</SegmentedControl.Root>
		<RadioGroup.Root defaultValue="a">
			<RadioGroup.Item value="a">
				<RadioGroup.Indicator />A
			</RadioGroup.Item>
		</RadioGroup.Root>
	</>
);

// An aliased import, beside a radio group that keeps it.
export const Aliased = (
	<>
		<SegmentedControl.Root aria-label="View" defaultValue="list">
			<SegmentedControl.Item value="list">List</SegmentedControl.Item>
		</SegmentedControl.Root>
		<MantleRadioGroup.Root defaultValue="a">
			<MantleRadioGroup.Item value="a">A</MantleRadioGroup.Item>
		</MantleRadioGroup.Root>
	</>
);

// Another library's part under the same name stays.
export const Other = (
	<OtherRadioGroup.ButtonGroup>
		<OtherRadioGroup.Button value="a">A</OtherRadioGroup.Button>
	</OtherRadioGroup.ButtonGroup>
);

// A parameter under the import's name shadows it, so the rules leave it alone.
export function Shadowed({ RadioGroup }: { RadioGroup: typeof OtherRadioGroup }) {
	return (
		<RadioGroup.ButtonGroup>
			<RadioGroup.Button value="a">A</RadioGroup.Button>
		</RadioGroup.ButtonGroup>
	);
}

// A file that already uses the new part under an alias.
export const Migrated = (
	<MantleSegmentedControl.Root aria-label="Mode">
		<MantleSegmentedControl.Item value="a">A</MantleSegmentedControl.Item>
	</MantleSegmentedControl.Root>
);
