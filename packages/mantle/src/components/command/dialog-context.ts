"use client";

import { createContext, useContext } from "react";
import invariant from "tiny-invariant";

/**
 * The state and actions every part under a `Command.DialogRoot` shares,
 * returned by {@link useCommandDialog}. Use it to open the palette from
 * anywhere in the app, to build a custom search trigger, or to read the query
 * a `shouldFilter={false}` palette needs to do its own matching.
 *
 * @see https://mantle.ngrok.com/components/navigation/command#usecommanddialog
 *
 * @example
 * ```tsx
 * function EmptyStateSearchLink() {
 *   const { openWithQuery } = useCommandDialog();
 *   return (
 *     <button type="button" onClick={() => openWithQuery("endpoints")}>
 *       Search endpoints
 *     </button>
 *   );
 * }
 * ```
 */
type CommandDialogState = {
	/**
	 * Whether the palette is open. Mirrored as `data-state="open" | "closed"` on
	 * `Command.SearchTrigger` and paired with its `aria-expanded`.
	 */
	open: boolean;
	/**
	 * Set the open state. **Opening through this resets the query to empty** —
	 * use {@link CommandDialogState.openWithQuery} to open with text in the
	 * field. Calls `onOpenChange` and, when uncontrolled, updates the internal
	 * state.
	 */
	setOpen: (open: boolean) => void;
	/**
	 * Open the palette with `query` already in `Command.Input`, or with an empty
	 * query when called with no argument. This is what `Command.SearchTrigger`
	 * calls when a keystroke or paste reaches it.
	 */
	openWithQuery: (query?: string) => void;
	/**
	 * Toggle the palette. Opening resets the query to empty, closing leaves it
	 * alone (the content animates out, so clearing it mid-animation would swap
	 * the visible list). This is what the `⌘K` shortcut calls.
	 */
	toggle: () => void;
	/**
	 * The current text of `Command.Input`. Read it to drive your own filtering
	 * or a server-side search when the palette runs with `shouldFilter={false}`.
	 *
	 * Only meaningful while `Command.Input` is uncontrolled — passing it a
	 * `value` takes ownership of the query, and this stops tracking the field.
	 */
	query: string;
	/**
	 * Set the query without touching the open state. `Command.Input` calls this
	 * as the user types.
	 */
	setQuery: (query: string) => void;
	/**
	 * Whether this root owns the `⌘K` / `Ctrl+K` shortcut. `Command.SearchTrigger`
	 * reads it to decide whether to render its shortcut hint and
	 * `aria-keyshortcuts`, so the hint can never advertise a binding that is
	 * not there.
	 */
	keyboardShortcut: boolean;
};

const CommandDialogContext = createContext<CommandDialogState | null>(null);

/**
 * Read the nearest `Command.DialogRoot` state. Throws when called outside one
 * so misuse fails loudly rather than rendering a trigger that opens nothing.
 *
 * Reach for it to open the palette from somewhere other than its trigger — a
 * sidebar row, an empty state, a "no results, search everything" link — or to
 * build a custom trigger, pairing it with
 * [`searchActionFromKeyDown`](https://mantle.ngrok.com/components/navigation/command#searchactionfromkeydown)
 * so typing into your trigger behaves like typing into `Command.SearchTrigger`.
 *
 * @see https://mantle.ngrok.com/components/navigation/command#usecommanddialog
 *
 * @example
 * ```tsx
 * function SearchEverythingItem({ query }: { query: string }) {
 *   const { openWithQuery } = useCommandDialog();
 *   return (
 *     <Command.Item onSelect={() => openWithQuery(query)}>
 *       Search everything for “{query}”
 *     </Command.Item>
 *   );
 * }
 * ```
 */
function useCommandDialog(): CommandDialogState {
	const context = useContext(CommandDialogContext);
	invariant(context, "useCommandDialog must be used within Command.DialogRoot.");
	return context;
}

/**
 * Read the nearest {@link CommandDialogContext} without requiring one. For
 * parts that work both inside a dialog and standalone under `Command.Root` —
 * `Command.Input` seeds itself from the dialog when there is one and stays
 * uncontrolled when there is not.
 */
function useOptionalCommandDialog(): CommandDialogState | null {
	return useContext(CommandDialogContext);
}

/**
 * Read the nearest {@link CommandDialogContext} for an internal part that
 * requires one. Throws with a part-specific message when rendered outside
 * `Command.DialogRoot`.
 */
function useCommandDialogContext(part: string): CommandDialogState {
	const context = useContext(CommandDialogContext);
	invariant(context, `Command.${part} must be rendered inside Command.DialogRoot.`);
	return context;
}

export {
	//,
	CommandDialogContext,
	useCommandDialog,
	useCommandDialogContext,
	useOptionalCommandDialog,
};

export type {
	//,
	CommandDialogState,
};
