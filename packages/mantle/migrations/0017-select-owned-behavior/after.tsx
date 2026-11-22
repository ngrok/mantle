import { Select } from "@ngrok/mantle/select";
import { Select as Picker } from "@ngrok/mantle/select";
import { Select as Other } from "@acme/select";

declare const side: "top" | "bottom";

export const Positioned = (
	<Select.Root defaultValue="apple">
		<Select.Trigger>
			<Select.Value placeholder="Pick a fruit" />
		</Select.Trigger>
		<Select.Content width="content">
			<Select.Item value="apple">Apple</Select.Item>
		</Select.Content>
	</Select.Root>
);

// A single-quoted or braced literal and a dynamic value are props all the same.
export const Spellings = (
	<Select.Root>
		<Select.Content>
			<Select.Item value="apple">Apple</Select.Item>
		</Select.Content>
	</Select.Root>
);

// The aliased import is the same part.
export const Aliased = (
	<Picker.Root>
		<Picker.Content className="max-h-64">
			<Picker.Item value="apple">Apple</Picker.Item>
		</Picker.Content>
	</Picker.Root>
);

// Another library's Select keeps its props.
export const Unrelated = (
	<Other.Root>
		<Other.Content position="popper" side={side} />
	</Other.Root>
);

// A parameter under the import's name shadows it.
export const Shadowed = ({ Select }: { Select: typeof Other }) => (
	<Select.Content position="popper" />
);

// Other Select parts keep a prop of the same name.
export const Trigger = (
	<Select.Root>
		<Select.Trigger data-side="left" />
	</Select.Root>
);

// A named class expression's own name shadows the import inside the class.
export const ClassShadowed = class Select {
	static Content = Other.Content;
	render() {
		return <Select.Content position="popper" />;
	}
};
