import { Combobox } from "@ngrok/mantle/combobox";
import { FocusShortcut } from "@ngrok/mantle/focus-shortcut";
import { Input, InputCapture } from "@ngrok/mantle/input";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/MagnifyingGlass";

import { PreviewCanvas } from "~/components/preview-canvas";
import { KeyboardShortcutQueryExample } from "~/features/query-demos";

/** The first example on the Focus Shortcut docs page. */
export function OverviewExample() {
	return (
		<PreviewCanvas>
			<FocusShortcut.Root>
				<Input className="max-w-sm">
					<MagnifyingGlassIcon />
					<FocusShortcut.Field>
						<InputCapture aria-label="Filter endpoints" placeholder="Filter endpoints" />
					</FocusShortcut.Field>
					<FocusShortcut.Hint />
				</Input>
			</FocusShortcut.Root>
		</PreviewCanvas>
	);
}

/** The "Query" example on the Focus Shortcut docs page. */
export function QueryExample() {
	return (
		<PreviewCanvas className="min-h-160">
			<KeyboardShortcutQueryExample />
		</PreviewCanvas>
	);
}

/** The "Combobox" example on the Focus Shortcut docs page. */
export function ComboboxExample() {
	return (
		<PreviewCanvas className="min-h-96">
			<Combobox.Root>
				<FocusShortcut.Root>
					<div className="relative max-w-sm">
						<FocusShortcut.Field>
							<Combobox.Input aria-label="Jump to an account" placeholder="Jump to an account" />
						</FocusShortcut.Field>
						<FocusShortcut.Hint className="absolute inset-y-0 inset-e-2.5 my-auto" />
					</div>
				</FocusShortcut.Root>
				<Combobox.Content>
					<Combobox.Item value="Acme Corp" />
					<Combobox.Item value="Globex" />
					<Combobox.Item value="Initech" />
				</Combobox.Content>
			</Combobox.Root>
		</PreviewCanvas>
	);
}
