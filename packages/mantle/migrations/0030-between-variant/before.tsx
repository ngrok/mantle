import { Accordion } from "@ngrok/mantle/accordion";
import { AlertDialog } from "@ngrok/mantle/alert-dialog";
import { Combobox } from "@ngrok/mantle/combobox";
import { cx } from "@ngrok/mantle/cx";

function Example({ spaced }: { spaced: boolean }) {
	return (
		<>
			<Accordion.Root className="space-y-2.5 divide-y-0">
				<Accordion.Item value="a" />
			</Accordion.Root>
			<Accordion.Root className='mt-1 divide-y-0'>
				<Accordion.Item value="b" />
			</Accordion.Root>
			<Combobox.Content className={cx("flex flex-col space-y-0 p-0", spaced && "md:space-y-2")} />
			<AlertDialog.Footer className="sm:space-x-4 divide-dashed" />
			{/* Not a part whose own classes use space-* or divide-*: unchanged. */}
			<Accordion.Item value="c" className="space-y-2" />
			<div className="space-y-2 divide-y" />
		</>
	);
}

export { Example };
