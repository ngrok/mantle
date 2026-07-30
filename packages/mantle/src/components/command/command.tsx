"use client";

import { MagnifyingGlassIcon } from "@phosphor-icons/react/MagnifyingGlass";
import { Command as CommandPrimitive, useCommandState } from "cmdk";

import type { ComponentProps, ComponentPropsWithoutRef, ReactNode, Ref } from "react";
import { useCallback, useMemo, useRef, useState } from "react";
import { cx } from "../../utils/cx/cx.js";
import type { WithDataSlot } from "../../utils/data-slot.js";
import { joinDataSlot } from "../../utils/data-slot.js";
import { Dialog } from "../dialog/dialog.js";
import { Separator } from "../separator/separator.js";
import type { CommandDialogState } from "./dialog-context.js";
import { CommandDialogContext, useOptionalCommandDialog } from "./dialog-context.js";
import { CommandSearchTrigger } from "./search-trigger.js";
import { useCommandShortcut } from "./use-command-shortcut.js";

type CommandRootProps = ComponentProps<typeof CommandPrimitive>;

/**
 * The inline palette, wrapping `Command.Input` and `Command.List`. It owns the
 * filtering and the active item for every part below it — `Command.DialogContent`
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
const CommandRoot = ({ className, ...props }: CommandRootProps) => (
	<CommandPrimitive
		data-slot="command"
		className={cx("bg-popover flex h-full w-full flex-col overflow-hidden rounded-md", className)}
		{...props}
	/>
);

/**
 * The props for `Command.DialogRoot`. `Dialog.Root`'s props — so `modal` still
 * reaches the underlying dialog — with the open state and the keyboard shortcut
 * redeclared here, because this part owns them.
 *
 * @see https://mantle.ngrok.com/components/navigation/command#commanddialogroot
 */
type CommandDialogRootProps = Omit<
	ComponentProps<typeof Dialog.Root>,
	"children" | "defaultOpen" | "onOpenChange" | "open"
> & {
	/**
	 * The palette's parts — a `Command.DialogContent`, and any trigger or
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
	 * shortcut requires exactly the platform modifier + `k`, resolved per host —
	 * the two never substitute for each other, so macOS's native `Ctrl+K` ("kill
	 * to end of line") is left alone. `Shift`/`Alt` combinations pass through.
	 *
	 * It lives here rather than on `Command.SearchTrigger` because the trigger
	 * may be unmounted while the shortcut must still work — a sidebar rendered
	 * as a mobile sheet unmounts its whole tree when the sheet is closed.
	 *
	 * The shortcut is ignored while focus is in a rich-text or code editor
	 * (`contenteditable`, or a `<textarea>`, which is what Monaco attaches to),
	 * where `⌘K` is already bound to "insert link" or a chord prefix. It
	 * deliberately still fires from a plain `<input>`, including the palette's
	 * own `Command.Input` — so the chord closes what it opened.
	 *
	 * Exactly one root per window owns the shortcut: the first mounted root that
	 * wants it. Additional roots queue and take over when the owner unmounts, so
	 * a second palette never opens alongside the first.
	 *
	 * Set `false` to bind the chord yourself with `useCommandDialog()`.
	 * `Command.SearchTrigger` then adds no `aria-keyshortcuts` of its own — pass
	 * one to announce the chord you bound — and `useCommandDialog().keyboardShortcut`
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
 * The state owner for a command palette. Renders no DOM of its own — it owns
 * the open state, the query text, and the `⌘K` shortcut, and carries them to
 * every part below through `useCommandDialog()`.
 *
 * Owning the query is what makes typing into `Command.SearchTrigger` work: the
 * seed and the open state land in one state update, so `Command.Input` mounts
 * with the character already in it and no keystroke races the dialog's mount.
 *
 * **Opening always starts from a known query** — the seed, or empty. That
 * happens at open time rather than by clearing on close, because
 * `Dialog.Content` animates out and clearing on close would swap the visible
 * list mid-animation. So dismissing and reopening never resurrects the previous
 * search.
 *
 * Pass `open`/`onOpenChange` to control the open state; the query stays
 * internal either way. To own the query too, pass `value`/`onValueChange` to
 * `Command.Input` — see that part for the trade-off.
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
			onOpenChange?.(nextOpen);
		},
		[isOpenControlled, onOpenChange],
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
	 * Custom filter function for the command list.
	 *
	 * @see https://github.com/pacocoursey/cmdk?tab=readme-ov-file#filtering
	 */
	filter?: CommandRootProps["filter"];
	/**
	 * Whether to enable filtering of command items. When false, disables built-in filtering.
	 *
	 * @see https://github.com/pacocoursey/cmdk?tab=readme-ov-file#filtering
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
				// Radix's own open-autofocus focuses the first candidate *and selects
				// its value*, which would make the first keystroke after a seeded open
				// replace the seed instead of extending it. Take the focus over and
				// collapse the caret to the end.
				// `~=`, not `=`: `Command.Input` joins a forwarded `data-slot` chain
				// ahead of its own, so the attribute is a space-separated list.
				const input = contentRef.current?.querySelector('[data-slot~="command-input"]');
				// No input, or one that cannot take focus: Radix's default is the
				// right answer, and preventing it would leave focus outside the
				// dialog with no focus trap.
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
				className="**:data-[slot=command-input-wrapper]:h-12 **:[[cmdk-input]]:h-12 **:data-[slot=command-group]:px-2 **:data-[slot=command-list]:pb-1"
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
 * palette, no dialog) it stays uncontrolled and cmdk owns the text.
 *
 * Passing `value` takes the query over completely: your value wins, this stops
 * reporting to `useCommandDialog()`, and **seeding becomes yours to apply** —
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
 * | `data-slot` | `"command-input"` | The `<input>` itself, joined after any `data-slot` you forward. Load-bearing beyond styling: `Command.DialogContent` finds the field by this slot when the palette opens, to place the caret after a seeded query instead of over it, so this part of the chain is never replaced. |
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
	className,
	"data-slot": dataSlot,
	onValueChange,
	ref,
	value,
	...props
}: ComponentPropsWithoutRef<typeof CommandPrimitive.Input> &
	WithDataSlot & {
		ref?: Ref<HTMLDivElement>;
	}) => {
	const dialog = useOptionalCommandDialog();
	const isControlled = value != null;
	// cmdk treats a non-nullish `value` as controlled and syncs it into its own
	// search state, so handing it the palette's query is enough to seed the
	// field and the filtering together. `undefined` (no dialog, no consumer
	// value) leaves cmdk uncontrolled.
	const resolvedValue = isControlled ? value : dialog?.query;

	return (
		<div
			ref={ref}
			data-slot="command-input-wrapper"
			className="flex h-9 items-center gap-2 border-b border-popover px-3"
		>
			<MagnifyingGlassIcon className="size-5 shrink-0 opacity-50" />
			<CommandPrimitive.Input
				className={cx(
					"placeholder:text-muted flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-hidden disabled:cursor-not-allowed disabled:opacity-50",
					className,
				)}
				onValueChange={(nextValue) => {
					if (!isControlled) {
						dialog?.setQuery(nextValue);
					}
					onValueChange?.(nextValue);
				}}
				value={resolvedValue}
				{...props}
				// After the spread, and joined rather than replaced: this slot is how
				// `Command.DialogContent` finds the field to place the caret, so a
				// forwarded `data-slot` must not be able to take it away.
				data-slot={joinDataSlot(dataSlot, "command-input")}
			/>
		</div>
	);
};

/**
 * The scrolling container for the palette's groups and items.
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
const CommandList = ({ className, ...props }: ComponentProps<typeof CommandPrimitive.List>) => (
	<CommandPrimitive.List
		data-slot="command-list"
		className={cx("max-h-75 scroll-py-1 overflow-x-hidden overflow-y-auto scrollbar", className)}
		{...props}
	/>
);

/**
 * The empty-state message; it renders only when no item matches the query.
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
const CommandEmpty = ({ className, ...props }: ComponentProps<typeof CommandPrimitive.Empty>) => (
	<CommandPrimitive.Empty
		data-slot="command-empty"
		className={cx("py-6 text-center text-sm", className)}
		{...props}
	/>
);

/**
 * A labeled section of items; the `heading` prop names it.
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
const CommandGroup = ({ className, ...props }: ComponentProps<typeof CommandPrimitive.Group>) => (
	<CommandPrimitive.Group
		data-slot="command-group"
		className={cx(
			"[&>[cmdk-group-heading]]:text-muted overflow-hidden p-1 [&>[cmdk-group-heading]]:px-2 [&>[cmdk-group-heading]]:py-1.5 [&>[cmdk-group-heading]]:text-xs [&>[cmdk-group-heading]]:font-medium",
			className,
		)}
		{...props}
	/>
);

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
	className,
	...props
}: ComponentProps<typeof CommandPrimitive.Separator>) => (
	<CommandPrimitive.Separator data-slot="command-separator" asChild {...props}>
		<Separator className={cx("-mx-1 my-1 w-auto", className)} />
	</CommandPrimitive.Separator>
);

/**
 * One selectable row in the palette's list.
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
const CommandItem = ({ className, ...props }: ComponentProps<typeof CommandPrimitive.Item>) => (
	<CommandPrimitive.Item
		data-slot="command-item"
		className={cx(
			"data-[selected=true]:bg-active-menu-item [:where(&_svg)]:text-muted relative flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [:where(&_svg)]:size-5",
			className,
		)}
		{...props}
	/>
);

/**
 * The keyboard hint for a `Command.Item`, aligned to the end of the row.
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
const CommandShortcut = ({ className, ...props }: ComponentProps<"span">) => (
	<span
		data-slot="command-shortcut"
		className={cx("text-muted ml-auto text-xs tracking-widest", className)}
		{...props}
	/>
);

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
const Command = {
	/**
	 * The inline palette, wrapping `Command.Input` and `Command.List`. It owns the
	 * filtering and the active item for every part below it — `Command.DialogContent`
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
	Root: CommandRoot,
	/**
	 * The state owner for the Command dialog. Owns the open state, the query
	 * text, and the `⌘K` shortcut, and renders no DOM of its own.
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
	DialogRoot: CommandDialogRoot,
	/**
	 * A button shaped like an `Input` that opens the palette, with the `⌘K` hint
	 * and keystroke/paste forwarding.
	 *
	 * @see https://mantle.ngrok.com/components/navigation/command#commandsearchtrigger
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
	SearchTrigger: CommandSearchTrigger,
	/**
	 * A bare button that opens the Command dialog when clicked — the escape hatch
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
	DialogTrigger: Dialog.Trigger,
	/**
	 * The visible content of the Command dialog. Renders inside the dialog portal.
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
	DialogContent: CommandDialogContent,
	/**
	 * The palette's query field.
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
	Input: CommandInput,
	/**
	 * The scrolling container for the palette's groups and items.
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
	List: CommandList,
	/**
	 * The empty-state message; it renders only when no item matches the query.
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
	Empty: CommandEmpty,
	/**
	 * A labeled section of items; the `heading` prop names it.
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
	Group: CommandGroup,
	/**
	 * One selectable row in the palette's list.
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
	Item: CommandItem,
	/**
	 * The keyboard hint for a `Command.Item`, aligned to the end of the row.
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
	Shortcut: CommandShortcut,
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
	Separator: CommandSeparator,
} as const;

export {
	//,
	Command,
	useCommandState,
};

export type {
	//,
	CommandDialogRootProps,
};
