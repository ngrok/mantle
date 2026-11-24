"use client";

import { MagnifyingGlassIcon } from "@phosphor-icons/react/MagnifyingGlass";
import type { ComponentProps, MouseEventHandler, PointerEventHandler, ReactNode, Ref } from "react";
import {
	createContext,
	use,
	useCallback,
	useId,
	useInsertionEffect,
	useMemo,
	useRef,
	useState,
	useSyncExternalStore,
} from "react";
import { composeHandlers, ignoreClick } from "../../behaviors/compose-handlers.js";
import { useListbox } from "../../behaviors/use-listbox.js";
import { useIsomorphicLayoutEffect } from "../../hooks/use-isomorphic-layout-effect.js";
import type { WithAsChild } from "../../types/as-child.js";
import { useComposedRefs } from "../../utils/compose-refs/use-composed-refs.js";
import { cx } from "../../utils/cx/cx.js";
import type { WithDataSlot } from "../../utils/data-slot.js";
import { joinDataSlot } from "../../utils/data-slot.js";
import { observeScrollEdges } from "../../utils/scroll-edges.js";
import * as Dialog from "../dialog/dialog-parts.js";
import { Separator } from "../separator/separator.js";
import { Slot } from "../slot/index.js";
import type { Command, CommandFilter, CommandState } from "./command-state.js";
import { createCommand } from "./command-state.js";
import type { CommandDialogState } from "./dialog-context.js";
import { CommandDialogContext, useOptionalCommandDialog } from "./dialog-context.js";
import { CommandSearchTrigger } from "./search-trigger.js";
import { useCommandShortcut } from "./use-command-shortcut.js";

type CommandContextValue = {
	command: Command;
	listboxId: string;
	listboxRef: Ref<HTMLElement>;
	label: string | undefined;
};

const CommandContext = createContext<CommandContextValue | null>(null);

const useCommandContext = (part: string): CommandContextValue => {
	const context = use(CommandContext);
	if (context == null) {
		throw new Error(`${part} must be used within Command.Root.`);
	}
	return context;
};

/** Whether a group's items render whatever the query is. */
const GroupContext = createContext(false);

const NO_SELECTION: readonly string[] = [];
const ignoreSelect = () => {};

/**
 * Names an input that has no other source of a name: no `aria-labelledby`, no
 * `id` that a `<label>` could point at, no `title`, and no `placeholder`.
 */
const defaultName = (props: {
	"aria-labelledby"?: string;
	id?: string;
	placeholder?: string;
	title?: string;
}) =>
	(props["aria-labelledby"] ?? props.id ?? props.title ?? props.placeholder) ? undefined : "Search";

/**
 * The props for `Command.Root`.
 *
 * @see https://mantle.ngrok.com/components/navigation/command#commandroot
 */
type CommandRootProps = Omit<ComponentProps<"div">, "defaultValue" | "onChange"> &
	WithDataSlot & {
		/**
		 * The accessible name of `Command.Input`. Not shown.
		 *
		 * @default "Search", when the input has no other name: no `aria-label`, `aria-labelledby`, `<label>`, `title`, or `placeholder`
		 */
		label?: string;
		/**
		 * Set `false` to turn off the built-in filtering and sorting. Then render
		 * only the items that match the query yourself.
		 *
		 * @default true
		 */
		shouldFilter?: boolean;
		/**
		 * Scores an item for the query, from 0 (hide the item) to 1 (the best
		 * match). The items sort by score, highest first. The default is a fuzzy
		 * match.
		 */
		filter?: CommandFilter;
		/**
		 * The value of the item that is active on the first render.
		 */
		defaultValue?: string;
		/**
		 * The value of the active item. A change activates the item with that
		 * value. Pair with `onValueChange`.
		 */
		value?: string;
		/**
		 * Called with the value of the item that becomes active, by keyboard,
		 * pointer, or a new query.
		 */
		onValueChange?: (value: string) => void;
		/**
		 * Whether the arrow keys wrap from the last item to the first, and back.
		 *
		 * @default false
		 */
		loop?: boolean;
		/**
		 * Whether a pointer that moves over an item leaves the active item alone.
		 *
		 * @default false
		 */
		disablePointerSelection?: boolean;
		/**
		 * Whether `Ctrl+N` / `Ctrl+J` move to the next item and `Ctrl+P` /
		 * `Ctrl+K` to the previous one.
		 *
		 * @default true
		 */
		vimBindings?: boolean;
	};

/**
 * The inline palette, wrapping `Command.Input` and `Command.List`. It owns the
 * filtering and the active item for every part below it. `Command.DialogContent`
 * renders one itself, so a modal palette does not add it.
 *
 * @see https://mantle.ngrok.com/components/navigation/command#commandroot
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
const CommandRoot = ({
	"data-slot": dataSlot,
	className,
	defaultValue,
	disablePointerSelection = false,
	filter,
	label,
	loop = false,
	onKeyDown,
	onValueChange,
	shouldFilter,
	value,
	vimBindings = true,
	...props
}: CommandRootProps) => {
	const [command] = useState(() => createCommand((value ?? defaultValue ?? "").trim()));
	const listbox = useListbox({
		selected: NO_SELECTION,
		onSelect: ignoreSelect,
		ownerRef: command.inputRef,
		selectionFollowsHighlight: true,
	});

	// Why an insertion effect: the list's ref callback and a microtask pass read these, and both
	// can run in the commit before a passive effect would write them.
	const { listboxRef: latestListboxRef, optionsRef } = command;
	useInsertionEffect(() => {
		latestListboxRef.current = listbox;
		optionsRef.current = {
			filter,
			shouldFilter,
			onValueChange,
			loop,
			disablePointerSelection,
		};
	});

	// Why an effect: a controlled `value` changes in the parent's render, and the item it names
	// is in the DOM only after the commit.
	useIsomorphicLayoutEffect(() => {
		if (value != null) {
			command.setValue(value.trim());
		}
	}, [command, value]);

	const listboxId = listbox.id;
	const listboxRef = listbox.listboxProps.ref;
	// Why memoized: every part reads this context, so a new value would re-render each item.
	const context = useMemo(
		() => ({ command, listboxId, listboxRef, label }),
		[command, listboxId, listboxRef, label],
	);

	return (
		<CommandContext value={context}>
			{/* oxlint-disable-next-line jsx-a11y/no-static-element-interactions -- Why: the keys from `Command.Input` bubble here, and the palette root has no role of its own. */}
			<div
				tabIndex={-1}
				{...props}
				data-slot={joinDataSlot(dataSlot, "command")}
				className={cx(
					"bg-popover flex h-full w-full flex-col overflow-hidden rounded-md",
					className,
				)}
				onKeyDown={composeHandlers(onKeyDown, (event) => {
					// oxlint-disable-next-line typescript/no-deprecated -- Why: `keyCode` 229 is the only marker for the keydown that starts an IME composition; `searchActionFromKeyDown` reads it too.
					if (event.nativeEvent.isComposing || event.keyCode === 229) {
						return;
					}
					const vim = vimBindings && event.ctrlKey;
					switch (event.key) {
						case "n":
						case "j":
						case "ArrowDown":
						case "p":
						case "k":
						case "ArrowUp": {
							const down = event.key === "ArrowDown" || event.key === "n" || event.key === "j";
							if (!event.key.startsWith("Arrow") && !vim) {
								return;
							}
							event.preventDefault();
							if (event.metaKey) {
								command.moveTo(down ? "last" : "first");
							} else {
								command.moveBy({ change: down ? 1 : -1, byGroup: event.altKey });
							}
							return;
						}
						case "Home":
						case "End": {
							event.preventDefault();
							command.moveTo(event.key === "Home" ? "first" : "last");
							return;
						}
						case "Enter": {
							event.preventDefault();
							command.select(command.getActive());
							return;
						}
						default: {
							// The input keeps every other key.
						}
					}
				})}
			/>
		</CommandContext>
	);
};

/**
 * Reads the palette state with a selector, and re-renders when the selected
 * value changes. Its state holds `search`, `value`, `selectedItemId`, and
 * `filtered` (`count`, `items`, `groups`).
 *
 * @see https://mantle.ngrok.com/components/navigation/command#usecommandstate
 *
 * @example
 * ```tsx
 * function ResultCount() {
 *   const count = useCommandState((state) => state.filtered.count);
 *   return <span aria-live="polite">{count} results</span>;
 * }
 * ```
 */
function useCommandState<T>(selector: (state: CommandState) => T): T {
	const { command } = useCommandContext("useCommandState");
	const read = () => selector(command.state);
	return useSyncExternalStore(command.subscribe, read, read);
}

/**
 * The props for `Command.DialogRoot`. `Dialog.Root`'s props (so `modal` still
 * reaches the underlying dialog), with the open state and the keyboard shortcut
 * redeclared here, because this part owns them.
 *
 * @see https://mantle.ngrok.com/components/navigation/command#commanddialogroot
 */
type CommandDialogRootProps = Omit<
	ComponentProps<typeof Dialog.Root>,
	"children" | "defaultOpen" | "onOpenChange" | "open"
> & {
	/**
	 * The palette's parts: a `Command.DialogContent`, and any trigger or
	 * consumer of `useCommandDialog()`. `DialogRoot` renders no DOM of its own.
	 */
	children?: ReactNode;
	/**
	 * The initial open state for the uncontrolled case.
	 *
	 * @default false
	 */
	defaultOpen?: boolean;
	/**
	 * Bind `⌘K` (macOS) / `Ctrl+K` (Windows/Linux) to toggle the palette. The
	 * shortcut requires exactly the platform modifier + `k`, resolved per host.
	 * The two never substitute for each other, so macOS's native `Ctrl+K` ("kill
	 * to end of line") is left alone. `Shift`/`Alt` combinations pass through.
	 *
	 * It lives here rather than on `Command.SearchTrigger` because the trigger
	 * may be unmounted while the shortcut must still work: a sidebar rendered
	 * as a mobile sheet unmounts its whole tree when the sheet is closed.
	 *
	 * The shortcut is ignored while focus is in a rich-text or code editor
	 * (`contenteditable`, or a `<textarea>`, which is what Monaco attaches to),
	 * where `⌘K` is already bound to "insert link" or a chord prefix. It
	 * deliberately still fires from a plain `<input>`, including the palette's
	 * own `Command.Input`, so the chord closes what it opened.
	 *
	 * An earlier `keydown` listener that calls `preventDefault()` (on `document`,
	 * or on an element) stops the shortcut. Do not bind `⌘K` in your app as
	 * well: delete the local binding, or set `false`.
	 *
	 * Exactly one root per window owns the shortcut: the first mounted root that
	 * wants it. Additional roots queue and take over when the owner unmounts, so
	 * a second palette never opens alongside the first.
	 *
	 * Set `false` to bind the chord yourself with `useCommandDialog()`.
	 * `Command.SearchTrigger` then adds no `aria-keyshortcuts` of its own (pass
	 * one to announce the chord you bound), and `useCommandDialog().keyboardShortcut`
	 * reports the same flag. The *visible* hint always belongs to the trigger's
	 * child, so gating that on the flag is the child's job.
	 *
	 * @default true
	 */
	keyboardShortcut?: boolean;
	/**
	 * Called with the next open state whenever it changes.
	 */
	onOpenChange?: (open: boolean) => void;
	/**
	 * Controlled open state. Pair with `onOpenChange`.
	 */
	open?: boolean;
};

/**
 * The state owner for a command palette. Renders no DOM of its own; it owns
 * the open state, the query text, and the `⌘K` shortcut, and carries them to
 * every part below through `useCommandDialog()`.
 *
 * Owning the query is what makes typing into `Command.SearchTrigger` work: the
 * seed and the open state land in one state update, so `Command.Input` mounts
 * with the character already in it and no keystroke races the dialog's mount.
 *
 * **Opening always starts from a known query**: the seed, or empty. That
 * happens at open time rather than by clearing on close, because
 * `Dialog.Content` animates out and clearing on close would swap the visible
 * list mid-animation. So dismissing and reopening never resurrects the previous
 * search.
 *
 * Pass `open`/`onOpenChange` to control the open state; the query stays
 * internal either way. To own the query too, pass `value`/`onValueChange` to
 * `Command.Input`. See that part for the trade-off.
 *
 * @see https://mantle.ngrok.com/components/navigation/command#commanddialogroot
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
const CommandDialogRoot = ({
	children,
	defaultOpen = false,
	keyboardShortcut = true,
	onOpenChange,
	open: openProp,
	...props
}: CommandDialogRootProps) => {
	const isOpenControlled = openProp != null;
	const [internalOpen, setInternalOpen] = useState(defaultOpen);
	const open = isOpenControlled ? openProp : internalOpen;
	const [query, setQuery] = useState("");

	// Why a ref: an inline `onOpenChange` has a new identity on every parent
	// render. If it is a `changeOpen` dependency, the context value takes a new
	// identity too, and every `useCommandDialog()` consumer re-renders. The
	// layout effect writes the latest callback before any handler can fire
	// after the commit.
	// Why not `useCallbackRef`: it writes its ref in a passive effect. `setOpen`
	// is public through `useCommandDialog()`, and a consumer's `useEffect` runs
	// before this component's in the same commit, so it would call the previous
	// render's callback.
	const onOpenChangeRef = useRef(onOpenChange);
	useIsomorphicLayoutEffect(() => {
		onOpenChangeRef.current = onOpenChange;
	});

	const changeOpen = useCallback(
		(nextOpen: boolean, nextQuery?: string) => {
			// Seed at open time, never clear at close: the content animates out, and
			// clearing the query on the way would swap the list mid-animation.
			if (nextOpen) {
				setQuery(nextQuery ?? "");
			}
			if (!isOpenControlled) {
				setInternalOpen(nextOpen);
			}
			onOpenChangeRef.current?.(nextOpen);
		},
		[isOpenControlled],
	);

	const setOpen = useCallback(
		(nextOpen: boolean) => {
			changeOpen(nextOpen);
		},
		[changeOpen],
	);

	const openWithQuery = useCallback(
		(nextQuery?: string) => {
			changeOpen(true, nextQuery);
		},
		[changeOpen],
	);

	const toggle = useCallback(() => {
		changeOpen(!open);
	}, [changeOpen, open]);

	useCommandShortcut({ enabled: keyboardShortcut, onTrigger: toggle });

	const contextValue = useMemo<CommandDialogState>(
		() => ({
			keyboardShortcut,
			open,
			openWithQuery,
			query,
			setOpen,
			setQuery,
			toggle,
		}),
		[keyboardShortcut, open, openWithQuery, query, setOpen, toggle],
	);

	return (
		<CommandDialogContext.Provider value={contextValue}>
			<Dialog.Root open={open} onOpenChange={setOpen} {...props}>
				{children}
			</Dialog.Root>
		</CommandDialogContext.Provider>
	);
};

/**
 * The props for the CommandDialog.Content component.
 *
 * @see https://mantle.ngrok.com/components/navigation/command#commanddialogcontent
 */
type CommandDialogContentProps = {
	/**
	 * The content of the command dialog (inputs, lists, etc.).
	 */
	children?: ReactNode;
	/**
	 * Class name(s) to apply to the command dialog content.
	 */
	className?: string;
	/**
	 * The accessible title of the command dialog. Visually hidden.
	 *
	 * @default "Command Palette"
	 */
	title?: string;
	/**
	 * The accessible description of the command dialog. Visually hidden.
	 *
	 * @default "Search for a command to run..."
	 */
	description?: string;
	/**
	 * Whether to show the close button.
	 *
	 * @default true
	 */
	showCloseButton?: boolean;
	/**
	 * Scores an item for the query, from 0 (hide the item) to 1 (the best
	 * match). See `Command.Root`.
	 */
	filter?: CommandRootProps["filter"];
	/**
	 * Whether to enable filtering of command items. When false, disables built-in filtering.
	 *
	 * @default true
	 */
	shouldFilter?: CommandRootProps["shouldFilter"];
};

/**
 * The content of the CommandDialog. Renders the accessible title/description,
 * the command palette UI, and an optional close button.
 *
 * @see https://mantle.ngrok.com/components/navigation/command#commanddialogcontent
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
const CommandDialogContent = ({
	children,
	className,
	description = "Search for a command to run...",
	filter,
	shouldFilter,
	showCloseButton = true,
	title = "Command Palette",
}: CommandDialogContentProps) => {
	const contentRef = useRef<HTMLDivElement>(null);

	return (
		<Dialog.Content
			ref={contentRef}
			className={cx("overflow-hidden p-0 relative", className)}
			onOpenAutoFocus={(event) => {
				// Why: the first keystroke after a seeded open must extend the seed.
				// Take the focus over and collapse the caret to the end.
				// `~=`, not `=`: `Command.Input` joins a forwarded `data-slot` chain
				// ahead of its own, so the attribute is a space-separated list.
				const input = contentRef.current?.querySelector('[data-slot~="command-input"]');
				// No input, or one that cannot take focus: the dialog's default focus
				// is the right answer.
				if (!(input instanceof HTMLInputElement) || input.disabled) {
					return;
				}
				event.preventDefault();
				input.focus({ preventScroll: true });
				const caret = input.value.length;
				input.setSelectionRange(caret, caret);
			}}
		>
			<Dialog.Header className="sr-only absolute">
				<Dialog.Title>{title}</Dialog.Title>
				<Dialog.Description>{description}</Dialog.Description>
			</Dialog.Header>
			<CommandRoot
				className="[&_[data-slot=command-input-wrapper]]:h-12 [&_[data-slot~=command-input]]:h-12 [&_[data-slot=command-group]]:px-2 [&_[data-slot=command-list]]:pb-1"
				filter={filter}
				shouldFilter={shouldFilter}
			>
				{children}
			</CommandRoot>
			{showCloseButton && (
				<div className="absolute top-1.5 right-1.5">
					<Dialog.CloseIconButton />
				</div>
			)}
		</Dialog.Content>
	);
};

/**
 * The palette's query field.
 *
 * Inside a `Command.DialogRoot` the palette owns the query by default, which is
 * what lets `Command.SearchTrigger` open with a seeded value and what
 * `useCommandDialog().query` reads. Under a bare `Command.Root` (an inline
 * palette, no dialog) it stays uncontrolled and the `<input>` owns the text.
 *
 * Passing `value` takes the query over completely: your value wins, this stops
 * reporting to `useCommandDialog()`, and **seeding becomes yours to apply**:
 * read `useCommandDialog().query` and mirror it, or drop
 * `Command.SearchTrigger` for a plain `Command.DialogTrigger`. Prefer leaving
 * it uncontrolled and reading the query from the hook.
 *
 * `className`, `ref`, and rest props land on the parts they belong to: `ref` on
 * the wrapper, everything else on the `<input>`.
 *
 * **Data attributes:**
 *
 * | Data Attribute | Value | Description |
 * | --- | --- | --- |
 * | `data-slot` | `"command-input-wrapper"` | The row holding the magnifier and the field. |
 * | `data-slot` | `"command-input"` | The `<input>` itself, joined after any `data-slot` you forward. Beyond styling, `Command.DialogContent` finds the field by this slot when the palette opens, to place the caret after a seeded query instead of over it, so this part of the chain is never replaced. |
 *
 * @see https://mantle.ngrok.com/components/navigation/command#commandinput
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
const CommandInput = ({
	asChild = false,
	className,
	"data-slot": dataSlot,
	onValueChange,
	ref,
	value,
	...props
}: Omit<ComponentProps<"input">, "onChange" | "ref" | "type" | "value"> &
	WithAsChild &
	WithDataSlot & {
		/**
		 * The controlled query text. Pair with `onValueChange`.
		 */
		value?: string;
		/**
		 * Called with the query text on each change.
		 */
		onValueChange?: (search: string) => void;
		/**
		 * Lands on the wrapper row, not on the `<input>`.
		 */
		ref?: Ref<HTMLDivElement>;
	}) => {
	const { command, label, listboxId } = useCommandContext("Command.Input");
	const { attachInput } = command;
	const dialog = useOptionalCommandDialog();
	const isControlled = value != null;
	// A non-nullish value controls the field and the filter; `undefined` (no dialog, no consumer
	// value) leaves the text to the `<input>` itself.
	const resolvedValue = isControlled ? value : dialog?.query;
	const Component = asChild ? Slot : "input";

	// Why an effect: the filter pass reads the options in the DOM, and a controlled query can
	// render new items (`shouldFilter={false}`) that exist only after the commit.
	useIsomorphicLayoutEffect(() => {
		if (resolvedValue != null) {
			command.setSearch(resolvedValue);
		}
	}, [command, resolvedValue]);

	return (
		<div
			ref={ref}
			data-slot="command-input-wrapper"
			className="flex h-9 items-center gap-2 border-b border-popover px-3"
		>
			<MagnifyingGlassIcon aria-hidden className="size-5 shrink-0 opacity-50" />
			<Component
				className={cx(
					// Why 16px on a touch screen: iOS Safari zooms the page when it focuses a field under 16px.
					"pointer-coarse:text-base",
					"placeholder:text-muted flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-hidden disabled:cursor-not-allowed disabled:opacity-50",
					className,
				)}
				{...props}
				ref={attachInput}
				type="text"
				role="combobox"
				autoComplete="off"
				autoCorrect="off"
				spellCheck={false}
				aria-autocomplete="list"
				aria-expanded
				aria-controls={listboxId}
				aria-label={label ?? props["aria-label"] ?? defaultName(props)}
				// Why: the list writes this attribute, so no consumer value may render over it.
				aria-activedescendant={undefined}
				value={resolvedValue}
				onChange={(event) => {
					const target = event.currentTarget;
					const nextValue = target instanceof HTMLInputElement ? target.value : "";
					if (resolvedValue == null) {
						command.setSearch(nextValue);
					} else if (!isControlled) {
						dialog?.setQuery(nextValue);
					}
					onValueChange?.(nextValue);
				}}
				// After the spread, and joined rather than replaced: this slot is how
				// `Command.DialogContent` finds the field to place the caret, so a
				// forwarded `data-slot` must not be able to take it away.
				data-slot={joinDataSlot(dataSlot, "command-input")}
			/>
		</div>
	);
};

/**
 * The scrolling container for the palette's groups and items: the
 * `role="listbox"` element. It scrolls with no visible scrollbar, fades its
 * edges where more items are past them, and does not move the page at its end.
 *
 * @see https://mantle.ngrok.com/components/navigation/command#commandlist
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
const CommandList = ({
	"data-slot": dataSlot,
	className,
	label = "Suggestions",
	onMouseDown,
	ref,
	...props
}: ComponentProps<"div"> &
	WithDataSlot & {
		/**
		 * The accessible name of the list. Not shown.
		 *
		 * @default "Suggestions"
		 */
		label?: string;
	}) => {
	const { command, listboxId, listboxRef } = useCommandContext("Command.List");
	const listRef = useComposedRefs(listboxRef, observeScrollEdges);
	const composedRef = useComposedRefs(listRef, command.attachList, ref);
	return (
		<div
			{...props}
			ref={composedRef}
			id={listboxId}
			role="listbox"
			tabIndex={-1}
			aria-label={label}
			data-slot={joinDataSlot(dataSlot, "command-list")}
			className={cx(
				// Why relative: the list scrolls an option into view from its offset, which needs the list as its offset parent.
				"relative max-h-75 scroll-py-6 overflow-x-hidden overflow-y-auto",
				// Why: the list scrolls by wheel, touch, and keyboard with no visible bar, and a scroll at its end neither bounces nor moves the page.
				// The `scroll-cue-y` fade is the cue that more items are past an edge.
				"scrollbar-none [&::-webkit-scrollbar]:hidden overscroll-y-none scroll-cue-y",
				className,
			)}
			onMouseDown={composeHandlers(onMouseDown, (event) => {
				// Why: a press inside the list must not move focus off `Command.Input`.
				event.preventDefault();
			})}
		/>
	);
};

/**
 * The empty-state message; it renders only when no item matches the query.
 *
 * It renders nothing in the server HTML and in the hydration pass. The palette
 * counts its matches in the DOM after the commit, which the server never
 * reaches. A palette with no items shows its empty state one render after
 * hydration.
 *
 * @see https://mantle.ngrok.com/components/navigation/command#commandempty
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
const CommandEmpty = ({
	asChild = false,
	"data-slot": dataSlot,
	className,
	...props
}: ComponentProps<"div"> & WithAsChild & WithDataSlot) => {
	const { command } = useCommandContext("Command.Empty");
	// Why `false` on the server: the server runs no filter pass, so it cannot count the matches.
	const isEmpty = useSyncExternalStore(command.subscribe, command.isEmpty, () => false);
	if (!isEmpty) {
		return null;
	}
	const Component = asChild ? Slot : "div";
	return (
		<Component
			role="presentation"
			{...props}
			data-slot={joinDataSlot(dataSlot, "command-empty")}
			className={cx("py-6 text-center text-sm", className)}
		/>
	);
};

/**
 * A labeled section of items; the `heading` prop names it. A query that
 * matches none of its items writes `hidden` on it, unless it has `forceMount`.
 *
 * | Data Attribute     | Value                     | Description                                      |
 * | ------------------ | ------------------------- | ------------------------------------------------ |
 * | `data-slot`        | `"command-group"`         | The group.                                       |
 * | `data-slot`        | `"command-group-heading"` | The heading, hidden from assistive technology.   |
 * | `data-slot`        | `"command-group-items"`   | The `role="group"` element that holds the items. |
 * | `data-force-mount` | `""`                      | Present when the group has `forceMount`.         |
 *
 * @see https://mantle.ngrok.com/components/navigation/command#commandgroup
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
const CommandGroup = ({
	children,
	"data-slot": dataSlot,
	className,
	forceMount = false,
	heading,
	value,
	...props
}: Omit<ComponentProps<"div">, "value"> &
	WithDataSlot & {
		/**
		 * The group's visible label. It names the group for assistive technology.
		 */
		heading?: ReactNode;
		/**
		 * A value for the group, written to `data-value`.
		 */
		value?: string;
		/**
		 * Whether the group and its items render whatever the query is.
		 *
		 * @default false
		 */
		forceMount?: boolean;
	}) => {
	useCommandContext("Command.Group");
	const headingId = useId();
	const itemsId = useId();
	const hasHeading = heading != null && heading !== false;
	return (
		<div
			{...props}
			role="presentation"
			data-value={value}
			data-force-mount={forceMount ? "" : undefined}
			data-slot={joinDataSlot(dataSlot, "command-group")}
			className={cx(
				"[&>[data-slot=command-group-heading]]:text-muted overflow-hidden p-1 [&>[data-slot=command-group-heading]]:px-2 [&>[data-slot=command-group-heading]]:py-1.5 [&>[data-slot=command-group-heading]]:text-xs [&>[data-slot=command-group-heading]]:font-medium",
				className,
			)}
		>
			{hasHeading && (
				<div aria-hidden id={headingId} data-slot="command-group-heading">
					{heading}
				</div>
			)}
			<div
				role="group"
				id={itemsId}
				aria-labelledby={hasHeading ? headingId : undefined}
				data-slot="command-group-items"
			>
				<GroupContext value={forceMount}>{children}</GroupContext>
			</div>
		</div>
	);
};

/**
 * A horizontal rule between two groups of items.
 *
 * @see https://mantle.ngrok.com/components/navigation/command#commandseparator
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
const CommandSeparator = ({
	alwaysRender = false,
	"data-slot": dataSlot,
	className,
	...props
}: Omit<ComponentProps<typeof Separator>, "orientation" | "semantic"> & {
	/**
	 * Whether the separator renders while a query is active too. Set it when
	 * you filter the items yourself (`shouldFilter={false}`).
	 *
	 * @default false
	 */
	alwaysRender?: boolean;
}) => {
	const { command } = useCommandContext("Command.Separator");
	const searching = useSyncExternalStore(
		command.subscribe,
		() => command.state.search !== "",
		() => command.state.search !== "",
	);
	if (searching && !alwaysRender) {
		return null;
	}
	return (
		<Separator
			semantic
			{...props}
			data-slot={joinDataSlot(dataSlot, "command-separator")}
			className={cx("-mx-1 my-1 w-auto", className)}
		/>
	);
};

/**
 * One selectable row in the palette's list. A query that does not match it
 * writes `hidden` on it, and it stays mounted.
 *
 * | Data Attribute     | Value                    | Description                                       |
 * | ------------------ | ------------------------ | ------------------------------------------------- |
 * | `data-slot`        | `"command-item"`         | The item.                                         |
 * | `data-highlighted` | present when highlighted | Presence-only. The item the keyboard or pointer is on. |
 * | `aria-disabled`    | `"true"` when disabled   | Set by `disabled`. Style it with `aria-disabled:`. |
 *
 * @see https://mantle.ngrok.com/components/navigation/command#commanditem
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
const CommandItem = ({
	asChild = false,
	"data-slot": dataSlot,
	className,
	disabled = false,
	forceMount,
	keywords,
	onClick,
	onPointerMove,
	onSelect,
	ref,
	value,
	...props
}: Omit<ComponentProps<"div">, "onClick" | "onPointerMove" | "onSelect" | "value"> &
	WithAsChild &
	WithDataSlot & {
		/**
		 * The click event handler. It runs before the item's `onSelect`.
		 */
		onClick?: MouseEventHandler<HTMLElement>;
		/**
		 * The pointer move event handler.
		 */
		onPointerMove?: PointerEventHandler<HTMLElement>;
		/**
		 * Whether the item can be activated and selected. A disabled item runs no
		 * click handler, and an `asChild` link does not navigate.
		 *
		 * @default false
		 */
		disabled?: boolean;
		/**
		 * Called with the item's value when it is selected, by click or `Enter`.
		 */
		onSelect?: (value: string) => void;
		/**
		 * The item's value, which the query matches and `onSelect` receives.
		 * When omitted, the item's trimmed text is the value. Pass a stable,
		 * unique value when the text changes or repeats.
		 */
		value?: string;
		/**
		 * More words that the query matches.
		 */
		keywords?: string[];
		/**
		 * Whether the item renders whatever the query is.
		 *
		 * @default false
		 */
		forceMount?: boolean;
	}) => {
	const { command } = useCommandContext("Command.Item");
	const groupForceMount = use(GroupContext);
	const id = useId();
	const Component = asChild ? Slot : "div";
	// Why a new callback each render: it registers the latest props and text, and React calls it
	// again only when the item renders.
	const register = (node: HTMLElement | null) => {
		if (node == null) {
			command.schedule();
		} else {
			command.register(node, {
				value,
				keywords: keywords?.map((keyword) => keyword.trim()) ?? [],
				forceMount: forceMount ?? groupForceMount,
				disabled,
				onSelect,
			});
		}
	};
	const composedRef = useComposedRefs(register, ref);
	return (
		<Component
			{...props}
			ref={composedRef}
			id={id}
			role="option"
			// Why `false`: the list writes `true` on the active item when it moves.
			aria-selected={false}
			aria-disabled={disabled || undefined}
			data-slot={joinDataSlot(dataSlot, "command-item")}
			className={cx(
				"data-highlighted:bg-active-menu-item [:where(&_svg)]:text-muted relative flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none aria-disabled:cursor-default aria-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [:where(&_svg)]:size-5",
				className,
			)}
			onPointerMove={(event) => {
				onPointerMove?.(event);
				// Why not a scroll: a hover must not scroll a half-visible item.
				if (!disabled && !command.optionsRef.current.disablePointerSelection) {
					command.listboxRef.current?.getStore().set({ activeId: event.currentTarget.id });
				}
			}}
			onClick={(event) => {
				onClick?.(event);
				command.select(event.currentTarget);
			}}
			{...(disabled && { onClickCapture: ignoreClick })}
		/>
	);
};

/**
 * The keyboard hint for a `Command.Item`, aligned to the end of the row. It
 * locks `translate="no"`: a translated shortcut key names the wrong key.
 *
 * @see https://mantle.ngrok.com/components/navigation/command#commandshortcut
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
const CommandShortcut = ({
	"data-slot": dataSlot,
	className,
	...props
}: Omit<ComponentProps<"span">, "translate"> & WithDataSlot) => (
	<span
		data-slot={joinDataSlot(dataSlot, "command-shortcut")}
		className={cx("text-muted ml-auto text-xs tracking-widest", className)}
		{...props}
		// Why after the spread: a wider props object can still carry `translate`
		// past the type, and a translated shortcut key names the wrong key.
		translate="no"
	/>
);

/**
 * A bare button that opens the Command dialog when clicked: the escape hatch
 * for a trigger that should not look like a search field. Wrap your own
 * element with `asChild`.
 *
 * It carries none of `Command.SearchTrigger`'s behavior: no `⌘K` hint, no
 * `aria-keyshortcuts`, and typing or pasting into it does nothing. Rebuild
 * that with `useCommandDialog()` and `searchActionFromKeyDown` /
 * `searchActionFromPaste` if you need it.
 *
 * @see https://mantle.ngrok.com/components/navigation/command#commanddialogtrigger
 *
 * @example
 * ```tsx
 * <Command.DialogRoot>
 *   <Command.DialogTrigger asChild>
 *     <Button type="button" appearance="outlined" intent="neutral">Open Command Palette</Button>
 *   </Command.DialogTrigger>
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
const DialogTrigger = Dialog.Trigger;

export {
	//,
	CommandRoot,
	CommandDialogRoot,
	CommandSearchTrigger,
	DialogTrigger,
	CommandDialogContent,
	CommandInput,
	CommandList,
	CommandEmpty,
	CommandGroup,
	CommandItem,
	CommandShortcut,
	CommandSeparator,
	useCommandState,
};

export type {
	//,
	CommandDialogRootProps,
};
