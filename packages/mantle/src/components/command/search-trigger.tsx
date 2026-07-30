"use client";

import type { ComponentProps, ReactElement } from "react";
import { Dialog } from "../dialog/dialog.js";
import { Slot } from "../slot/index.js";
import { joinDataSlot } from "../../utils/data-slot.js";
import { useCommandDialogContext } from "./dialog-context.js";
import type { SearchAction } from "./search-action.js";
import { searchActionFromKeyDown, searchActionFromPaste } from "./search-action.js";
import { useIsApplePlatform } from "../../hooks/use-is-apple-platform.js";

/**
 * The props for `Command.SearchTrigger`.
 *
 * @see https://mantle.ngrok.com/components/navigation/command#commandsearchtrigger
 */
type CommandSearchTriggerProps = Omit<ComponentProps<typeof Slot>, "children"> & {
	/**
	 * The control that opens the palette — the row or button a user sees.
	 *
	 * A single element, required: this part renders no DOM of its own and
	 * clones what it is given, so text renders nothing to click and no children
	 * renders no trigger at all. In a sidebar this is a
	 * [`Sidebar.SearchTrigger`](https://mantle.ngrok.com/components/navigation/sidebar#sidebarsearchtrigger);
	 * anywhere else it is whatever your design calls for.
	 */
	children: ReactElement;
};

/**
 * Makes any control behave like a search field that opens the command palette.
 * It renders no DOM of its own — it clones its child and gives it the wiring,
 * so **presentation belongs entirely to the child** and this part never has an
 * opinion about how the trigger looks or how it behaves in a collapsed sidebar
 * rail.
 *
 * The child stays a `<button>`, not a text field, even when it looks like one:
 * it opens a modal palette, so a screen reader hears "has popup dialog,
 * collapsed" while a sighted user sees a field. A real `<input>` with results
 * in a popover is a combobox, and
 * [Combobox](https://mantle.ngrok.com/components/forms/combobox) is the
 * component for that intent.
 *
 * Because a search-shaped control invites typing, the wiring makes typing work:
 * a printable keystroke or a paste while the trigger has focus opens the
 * palette with that text already in `Command.Input`, so no character is lost
 * between the trigger and the field. `Enter`, `Space`, and a click open it
 * empty. See
 * [`searchActionFromKeyDown`](https://mantle.ngrok.com/components/navigation/command#searchactionfromkeydown)
 * for the exact policy, including IME composition.
 *
 * What it contributes to the child:
 *
 * - `aria-haspopup="dialog"`, `aria-expanded`, `aria-controls`, `data-state`,
 *   and focus restoration on close, from the `Dialog.Trigger` it composes.
 * - `aria-keyshortcuts`, so the `⌘K` binding is announced rather than only
 *   drawn — present only when `Command.DialogRoot` owns the shortcut, so it can
 *   never advertise a binding that is not bound.
 * - `onKeyDown` and `onPaste`, composed with the child's own handlers.
 * - `data-slot="command-search-trigger"`, joined ahead of the child's own slot.
 *
 * Every other prop it receives passes through to the child, so composing it
 * inside another cloning trigger works: `Sidebar.Tooltip` → `Command.SearchTrigger`
 * → `Sidebar.SearchTrigger` routes the tooltip's handlers all the way down.
 *
 * It adds no accessible name: the child's visible label is the name, so the two
 * cannot drift apart. A visible `⌘K` hint belongs to the child and should be
 * `aria-hidden` there, since `aria-keyshortcuts` already announces the chord —
 * `Sidebar.SearchTrigger`'s `shortcut` prop does that for you.
 *
 * @see https://mantle.ngrok.com/components/navigation/command#commandsearchtrigger
 *
 * @example
 * ```tsx
 * <Command.DialogRoot>
 *   <Command.SearchTrigger>
 *     <button type="button">
 *       <MagnifyingGlassIcon />
 *       <span>Search…</span>
 *     </button>
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
 *
 * @example
 * In a sidebar, where `Sidebar.SearchTrigger` owns the row's appearance in both
 * panel states — including its hover-revealed shortcut hint — and
 * `Sidebar.Tooltip` labels it in the collapsed rail:
 * ```tsx
 * <Sidebar.Body>
 *   <Command.DialogRoot>
 *     <Sidebar.Tooltip label="Search">
 *       <Command.SearchTrigger>
 *         <Sidebar.SearchTrigger
 *           shortcut={
 *             <>
 *               <MetaKey />
 *               <Kbd>K</Kbd>
 *             </>
 *           }
 *         >
 *           <MagnifyingGlassIcon />
 *           <span className="min-w-0 flex-1 truncate">Search</span>
 *         </Sidebar.SearchTrigger>
 *       </Command.SearchTrigger>
 *     </Sidebar.Tooltip>
 *     <Command.DialogContent>
 *       <Command.Input placeholder="Search endpoints, agents, and settings..." />
 *       <Command.List>
 *         <Command.Empty>No results found.</Command.Empty>
 *       </Command.List>
 *     </Command.DialogContent>
 *   </Command.DialogRoot>
 * </Sidebar.Body>
 * ```
 */
// Why no `asChild` prop: this part is *only* a child-cloning wrapper, so
// cloning is unconditional rather than opt-in — the same shape as
// `Sidebar.Tooltip`, which also takes a required single-element `children`.
const CommandSearchTrigger = ({
	children,
	"data-slot": dataSlot,
	onKeyDown,
	onPaste,
	...props
}: CommandSearchTriggerProps) => {
	const { keyboardShortcut, openWithQuery } = useCommandDialogContext("SearchTrigger");
	const isApple = useIsApplePlatform();

	const applyAction = (action: SearchAction) => {
		switch (action.type) {
			case "seed":
				openWithQuery(action.query);
				return;
			case "open":
				openWithQuery();
				return;
			case "ignore":
				return;
		}
	};

	return (
		<Dialog.Trigger asChild>
			<Slot
				// Rest props first: composing this inside another cloning trigger — a
				// `Sidebar.Tooltip`, say — routes that trigger's pointer and focus
				// handlers, `aria-describedby`, and `data-state` through here, and
				// dropping them leaves the outer trigger inert.
				{...props}
				aria-keyshortcuts={keyboardShortcut ? (isApple ? "Meta+K" : "Control+K") : undefined}
				data-slot={joinDataSlot(dataSlot, "command-search-trigger")}
				onKeyDown={(event) => {
					onKeyDown?.(event);
					if (event.defaultPrevented) {
						return;
					}
					// React's synthetic keyboard event carries no `isComposing`, so the
					// policy reads the native one.
					const action = searchActionFromKeyDown(event.nativeEvent);
					if (action.type === "seed") {
						// Keep the character from also reaching the page — `/` opens
						// Firefox's quick-find, and a bare letter can hit an app-level
						// hotkey.
						event.preventDefault();
					}
					applyAction(action);
				}}
				onPaste={(event) => {
					onPaste?.(event);
					if (event.defaultPrevented) {
						return;
					}
					applyAction(searchActionFromPaste(event.nativeEvent));
				}}
			>
				{children}
			</Slot>
		</Dialog.Trigger>
	);
};

export {
	//,
	CommandSearchTrigger,
};

export type {
	//,
	CommandSearchTriggerProps,
};
