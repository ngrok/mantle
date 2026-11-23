import { RadioGroup as MantleRadioGroup } from "@ngrok/mantle/radio-group";
import { RadioGroup } from "@ngrok/mantle/radio-group";
import { SegmentedControl } from "@ngrok/mantle/segmented-control";
import { RadioGroup as HeadlessRadioGroup } from "@headlessui/react";

export function Plans() {
	return (
		<RadioGroup.Root defaultValue="free" onValueChange={(value: string) => console.log(value)}>
			<RadioGroup.Item value="free">Free</RadioGroup.Item>
			<RadioGroup.ListItem value="pro" />
			<RadioGroup.Card value="team">
				<RadioGroup.ItemContent asChild>
					<p>Team</p>
				</RadioGroup.ItemContent>
			</RadioGroup.Card>
		</RadioGroup.Root>
	);
}

declare function setPlan(value: string): void;

export function Aliased() {
	return (
		<MantleRadioGroup.List onValueChange={setPlan}>
			<MantleRadioGroup.Item value="a" />
		</MantleRadioGroup.List>
	);
}

export function Environment() {
	return (
		<SegmentedControl.Root aria-label="Environment" onValueChange={setPlan}>
			<SegmentedControl.Item value="dev">Dev</SegmentedControl.Item>
		</SegmentedControl.Root>
	);
}

// Another library's radio group keeps its props.
export function Headless() {
	return (
		<HeadlessRadioGroup by="id" onChange={setPlan}>
			<HeadlessRadioGroup.Option as="li" value="a" />
		</HeadlessRadioGroup>
	);
}

// A local binding shadows the import, so the rule cannot tell which one the element reads.
type Local = { Item: (props: { as: string; value: string }) => null };
export function Shadowed({ RadioGroup }: { RadioGroup: Local }) {
	return <RadioGroup.Item as="li" value="a" />;
}
