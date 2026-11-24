import { useState } from "react";
import { Combobox } from "@ngrok/mantle/combobox";
import { Combobox as Picker } from "@ngrok/mantle/combobox";
import { Combobox as Other } from "@acme/combobox";

export const Controlled = () => {
	const [query, setQuery] = useState("");
	return (
		<Combobox.Root value={query} setValue={setQuery} selectedValue="Apple" setSelectedValue={() => {}} setOpen={() => {}}>
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
	<Picker.Root defaultValue="App" defaultSelectedValue="Apple">
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

// A named class expression's own name shadows the import inside the class.
export const ClassShadowed = class Combobox {
	static Root = Other.Root;
	render() {
		return <Combobox.Root value="a" />;
	}
};

// A lone value or defaultValue is ambiguous: it set the text before and sets
// the picked value now, so the rules report it and leave it.
export const Lone = <Combobox.Root defaultValue="App" />;

// mantle's own text setter is an Ariakit name too.
export const TextSetter = <Combobox.Root inputValue="a" setInputValue={() => {}} />;

// A bare or true click opt-out does nothing now, so the rules delete it. A false
// or computed opt-out changed the click, so the rules report it and leave it.
export const ClickOptOuts = ({ keepOpen }: { keepOpen: boolean }) => (
	<Combobox.Root>
		<Combobox.Content>
			<Combobox.Item value="Apple" hideOnClick setValueOnClick={true} selectValueOnClick />
			<Picker.Item value="Banana" setValueOnClick={false} hideOnClick={keepOpen} />
			<Other.Item value="Cherry" hideOnClick />
		</Combobox.Content>
	</Combobox.Root>
);
