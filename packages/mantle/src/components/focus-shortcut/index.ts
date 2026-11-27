/**
 * Re-exports for the FocusShortcut component.
 *
 * @see https://mantle.ngrok.com/components/forms/focus-shortcut
 */

import * as FocusShortcutParts from "./focus-shortcut-parts.js";

/**
 * Makes the slash key (`/`) move focus into one field from anywhere on the
 * page, and shows a `/` hint where the design places it. It wraps any
 * focusable field: `Input`, `InputCapture`, `TextArea`, `Combobox.Input`, or
 * `Query.Input`. The key still types a slash in any text control.
 *
 * Give the shortcut to the one primary filter on a page. When
 * two fields have it, `/` goes to the field that mounted first and can take focus.
 *
 * @useWhen Let the slash key (`/`) focus the primary filter or text box on a page, and show a `/`
 * hint beside it.
 *
 * @siblings
 * - `Kbd`: show a key in copy or a tooltip, with no shortcut behind it.
 * - `Command`: a `⌘K` palette that runs an action or navigates.
 *
 * @see https://mantle.ngrok.com/components/forms/focus-shortcut
 *
 * @example
 * Composition:
 * ```
 * FocusShortcut.Root
 * ├── FocusShortcut.Field
 * └── FocusShortcut.Hint
 * ```
 *
 * @example
 * ```tsx
 * <FocusShortcut.Root>
 *   <Input>
 *     <MagnifyingGlassIcon />
 *     <FocusShortcut.Field>
 *       <InputCapture aria-label="Filter endpoints" placeholder="Filter endpoints" />
 *     </FocusShortcut.Field>
 *     <FocusShortcut.Hint />
 *   </Input>
 * </FocusShortcut.Root>
 * ```
 */
const FocusShortcut = FocusShortcutParts;

export {
	//,
	FocusShortcut,
};
export type {
	//,
	FocusShortcutRootProps,
	FocusShortcutFieldProps,
	FocusShortcutHintProps,
} from "./focus-shortcut.js";
