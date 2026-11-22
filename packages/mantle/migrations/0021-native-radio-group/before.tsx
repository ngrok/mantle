import { RadioGroup as MantleRadioGroup } from "@ngrok/mantle/radio-group";
import { RadioGroup } from "@ngrok/mantle/radio-group";
import { SegmentedControl } from "@ngrok/mantle/segmented-control";
import { RadioGroup as HeadlessRadioGroup } from "@headlessui/react";

export function Plans() {
	return (
		<RadioGroup.Root by="id" defaultValue="free" onChange={(value: string) => console.log(value)}>
			<RadioGroup.Item as="li" value="free">
				Free
			</RadioGroup.Item>
			<RadioGroup.ListItem as='span' value="pro" />
			<RadioGroup.Card as={"div"} value="team">
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
		<MantleRadioGroup.List by={(a: string, b: string) => a === b} onChange={setPlan}>
			<MantleRadioGroup.Item as="div" value="a" />
		</MantleRadioGroup.List>
	);
}

export function Environment() {
	return (
		<SegmentedControl.Root by="id" aria-label="Environment" onChange={setPlan}>
			<SegmentedControl.Item as="span" value="dev">
				Dev
			</SegmentedControl.Item>
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
