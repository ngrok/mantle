import { RadioGroup, RadioGroup as MantleRadioGroup } from "@ngrok/mantle/radio-group";
import { RadioGroup as OtherRadioGroup } from "@acme/ui";
import type { ComponentProps } from "react";

// A type query on the old part.
export type ViewProps = ComponentProps<typeof RadioGroup.ButtonGroup>;

export const Environment = (
	<RadioGroup.ButtonGroup aria-label="Environment" defaultValue="production">
		<RadioGroup.Button value="development">Dev</RadioGroup.Button>
		<RadioGroup.Button value="staging" disabled>
			Staging
		</RadioGroup.Button>
		<RadioGroup.Button value="production">Prod</RadioGroup.Button>
	</RadioGroup.ButtonGroup>
);

// A self-closing segment, and the plain radios a file keeps beside it.
export const Mixed = (
	<>
		<RadioGroup.ButtonGroup aria-label="Size" defaultValue="small">
			<RadioGroup.Button value="small" aria-label="Small" />
		</RadioGroup.ButtonGroup>
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
		<MantleRadioGroup.ButtonGroup aria-label="View" defaultValue="list">
			<MantleRadioGroup.Button value="list">List</MantleRadioGroup.Button>
		</MantleRadioGroup.ButtonGroup>
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
