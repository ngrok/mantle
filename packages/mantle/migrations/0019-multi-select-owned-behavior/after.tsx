import { useState } from "react";
import { MultiSelect } from "@ngrok/mantle/multi-select";
import { MultiSelect as Picker } from "@ngrok/mantle/multi-select";
import { MultiSelect as Other } from "@acme/multi-select";

export const Controlled = () => {
	const [query, setQuery] = useState("");
	return (
		<MultiSelect.Root inputValue={query} setInputValue={setQuery}>
			<MultiSelect.Trigger>
				<MultiSelect.Input aria-label="Fruit" />
			</MultiSelect.Trigger>
			<MultiSelect.Content sameWidth>
				<MultiSelect.Item value="apple">Apple</MultiSelect.Item>
				<MultiSelect.Item value="banana">Banana</MultiSelect.Item>
			</MultiSelect.Content>
		</MultiSelect.Root>
	);
};

// The aliased import is the same part. An item keeps its own value.
export const Aliased = (
	<Picker.Root defaultInputValue="app">
		<Picker.Content>
			<Picker.Item value="apple">Apple</Picker.Item>
		</Picker.Content>
	</Picker.Root>
);

// Another library's MultiSelect keeps its props.
export const Unrelated = (
	<Other.Root value="a" setValue={() => {}}>
		<Other.Content gutter={4} modal />
	</Other.Root>
);

// A parameter under the import's name shadows it.
export const Shadowed = ({ MultiSelect }: { MultiSelect: typeof Other }) => (
	<MultiSelect.Root value="a" />
);
