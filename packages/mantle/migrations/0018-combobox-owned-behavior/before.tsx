import { useState } from "react";
import { Combobox } from "@ngrok/mantle/combobox";
import { Combobox as Picker } from "@ngrok/mantle/combobox";
import { Combobox as Other } from "@acme/combobox";

export const Controlled = () => {
	const [query, setQuery] = useState("");
	return (
		<Combobox.Root value={query} setValue={setQuery}>
			<Combobox.Input aria-label="Fruit" />
			<Combobox.Content unmountOnHide={false} gutter={4} placement="bottom-start" sameWidth>
				<Combobox.Item value="Apple" focusOnHover />
				<Combobox.Item value="Banana" focusOnHover={false} />
			</Combobox.Content>
		</Combobox.Root>
	);
};

// The aliased import is the same part. An item keeps its own value.
export const Aliased = (
	<Picker.Root defaultValue="App">
		<Picker.Input aria-label="Fruit" />
		<Picker.Content portal>
			<Picker.Item value="Apple" />
		</Picker.Content>
	</Picker.Root>
);

// Another library's Combobox keeps its props.
export const Unrelated = (
	<Other.Root value="a" setValue={() => {}}>
		<Other.Content gutter={4} />
	</Other.Root>
);

// A parameter under the import's name shadows it.
export const Shadowed = ({ Combobox }: { Combobox: typeof Other }) => <Combobox.Root value="a" />;
