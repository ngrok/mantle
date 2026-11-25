import { Accordion } from "@ngrok/mantle/accordion";
import { AlertDialog } from "@ngrok/mantle/alert-dialog";
import { Combobox as Picker } from "@ngrok/mantle/combobox";
import { cx } from "@ngrok/mantle/cx";
import { Select } from "@ngrok/mantle/select";
import { SplitButton } from "@ngrok/mantle/split-button";
import { Sidebar } from "another-library";

function Example({ spaced, mode }: { spaced: boolean; mode: string }) {
	return (
		<>
			<Accordion.Root className="between:mbe-2.5 between:border-b-0">
				<Accordion.Item value="a" />
			</Accordion.Root>
			<Accordion.Root className="mt-1 between:border-b between:border-b-2 md:between:border-yellow-500">
				<Accordion.Item value="b" />
			</Accordion.Root>
			<Picker.Content
				className={cx("flex flex-col between:mbe-0 p-0", spaced && "md:between:-mbe-2")}
			/>
			<AlertDialog.Footer className="sm:between:me-4 between:border-dashed" />
			<Select.Group asChild>
				<section className="between:mbe-0">
					<div>A</div>
				</section>
			</Select.Group>
			<SplitButton.MenuContent className="between:mbe-0" />
			{/* Left for a person: a reverse utility, an arbitrary variant, and a comparison. */}
			<AlertDialog.Footer className="sm:flex-row-reverse sm:space-x-4 sm:space-x-reverse" />
			<Accordion.Root
				data-label="x:space-y-2"
				className="[&[data-label='x:space-y-2']]:space-y-4"
			/>
			<Accordion.Root className={cx(mode === "divide-y" && "between:border-b-2")} />
			{/* Not a part whose own classes use space-* or divide-*: unchanged. */}
			<Accordion.Item value="c" className="space-y-2" />
			<div className="space-y-2 divide-y" />
			<Sidebar.Body className="space-y-2" />
		</>
	);
}

function Shadowed({ Accordion }: { Accordion: { Root: () => null } }) {
	return <Accordion.Root className="space-y-2" />;
}

export {
	//,
	Example,
	Shadowed,
};
