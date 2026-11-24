/**
 * Re-exports for the Command component.
 *
 * @see https://mantle.ngrok.com/components/navigation/command
 */

import * as CommandParts from "./command-parts.js";

export {
	//,
	useCommandState,
} from "./command.js";

/**
 * A command palette: a modal search field over a filtered, keyboard-navigable
 * list of items. `Command.SearchTrigger` is the field-shaped button that opens
 * it, `Command.DialogRoot` owns the open state, the query, and the `⌘K`
 * shortcut, and `Command.DialogTrigger` is the escape hatch for a trigger of
 * your own.
 *
 * Use `Command.Root` instead of `Command.DialogRoot` for an inline palette that
 * is always visible. For a text field that filters options in place rather than
 * opening a modal, the component is
 * [Combobox](https://mantle.ngrok.com/components/forms/combobox).
 *
 * @useWhen Search for an action or a page and run it from a keyboard-first palette, such as a `⌘K`
 * menu.
 *
 * @siblings
 * - `Combobox`: the text field filters options in place and sets a form value.
 * - `DropdownMenu`: a short list of actions opens from one button.
 * - `Query`: a filter field on the page that `/` focuses.
 *
 * @see https://mantle.ngrok.com/components/navigation/command
 *
 * @example
 * Composition:
 * ```
 * Command.DialogRoot
 * ├── Command.SearchTrigger
 * ├── Command.DialogTrigger
 * └── Command.DialogContent
 *     ├── Command.Input
 *     └── Command.List
 *         ├── Command.Empty
 *         ├── Command.Group
 *         │   └── Command.Item
 *         │       └── Command.Shortcut
 *         └── Command.Separator
 * ```
 *
 * @example
 * ```tsx
 * <Command.DialogRoot>
 *   <Command.SearchTrigger>
 *     <button type="button">Search…</button>
 *   </Command.SearchTrigger>
 *   <Command.DialogContent>
 *     <Command.Input placeholder="Type a command or search..." />
 *     <Command.List>
 *       <Command.Empty>No results found.</Command.Empty>
 *       <Command.Group heading="Suggestions">
 *         <Command.Item>
 *           <span>Calendar</span>
 *         </Command.Item>
 *       </Command.Group>
 *       <Command.Separator />
 *       <Command.Group heading="Settings">
 *         <Command.Item>
 *           <span>Profile</span>
 *           <Command.Shortcut>⌘,</Command.Shortcut>
 *         </Command.Item>
 *       </Command.Group>
 *     </Command.List>
 *   </Command.DialogContent>
 * </Command.DialogRoot>
 * ```
 */
const Command = CommandParts;

export {
	//,
	Command,
};

export type {
	//,
	CommandDialogRootProps,
} from "./command.js";

export {
	//,
	useCommandDialog,
} from "./dialog-context.js";

export type {
	//,
	CommandDialogState,
} from "./dialog-context.js";

export {
	//,
	MetaKey,
} from "./meta-key.js";

export {
	//,
	searchActionFromKeyDown,
	searchActionFromPaste,
} from "./search-action.js";

export type {
	//,
	SearchAction,
	SearchKeyDownEvent,
	SearchPasteEvent,
} from "./search-action.js";

export type {
	//,
	CommandSearchTriggerProps,
} from "./search-trigger.js";
