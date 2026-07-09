"use client";

import { MagnifyingGlassIcon } from "@phosphor-icons/react/MagnifyingGlass";
import { Command as CommandPrimitive, useCommandState } from "cmdk";

import {
	type ComponentPropsWithoutRef,
	type ComponentRef,
	type ReactNode,
	forwardRef,
} from "react";
import { cx } from "../../utils/cx/cx.js";
import { Dialog } from "../dialog/dialog.js";
import { Separator } from "../separator/separator.js";

type CommandRootProps = ComponentPropsWithoutRef<typeof CommandPrimitive>;

/**
 * The root component for the Command. It provides the context for all other command sub-components.
 *
 * @see https://mantle.ngrok.com/components/command#commandroot
 *
 * @example
 * ```tsx
 * <Command.Dialog.Root open={open} onOpenChange={setOpen}>
 *   <Command.Dialog.Trigger asChild>
 *     <Button type="button">Open Command Palette</Button>
 *   </Command.Dialog.Trigger>
 *   <Command.Dialog.Content>
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
 *   </Command.Dialog.Content>
 * </Command.Dialog.Root>
 * ```
 */
const CommandRoot = forwardRef<ComponentRef<"div">, CommandRootProps>(
	({ className, ...props }, ref) => (
		<CommandPrimitive
			ref={ref}
			data-slot="command"
			className={cx("bg-popover flex h-full w-full flex-col overflow-hidden rounded-md", className)}
			{...props}
		/>
	),
);
CommandRoot.displayName = "Command";

/**
 * The props for the CommandDialog.Content component.
 *
 * @see https://mantle.ngrok.com/components/command#commanddialogcontent
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
 * @see https://mantle.ngrok.com/components/command#commanddialogcontent
 *
 * @example
 * ```tsx
 * <Command.Dialog.Root open={open} onOpenChange={setOpen}>
 *   <Command.Dialog.Trigger asChild>
 *     <Button type="button">Open Command Palette</Button>
 *   </Command.Dialog.Trigger>
 *   <Command.Dialog.Content>
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
 *   </Command.Dialog.Content>
 * </Command.Dialog.Root>
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
}: CommandDialogContentProps) => (
	<Dialog.Content className={cx("overflow-hidden p-0 relative", className)}>
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
CommandDialogContent.displayName = "CommandDialogContent";

/**
 * A compound namespace for building a command palette dialog with trigger support.
 *
 * @see https://mantle.ngrok.com/components/command#commanddialog
 *
 * @example
 * ```tsx
 * <Command.Dialog.Root open={open} onOpenChange={setOpen}>
 *   <Command.Dialog.Trigger asChild>
 *     <Button type="button">Open Command Palette</Button>
 *   </Command.Dialog.Trigger>
 *   <Command.Dialog.Content>
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
 *   </Command.Dialog.Content>
 * </Command.Dialog.Root>
 * ```
 */
const CommandDialog = {
	/**
	 * The root stateful component for the CommandDialog. Manages open/closed state.
	 *
	 * @see https://mantle.ngrok.com/components/command#commanddialogroot
	 *
	 * @example
	 * ```tsx
	 * <Command.Dialog.Root open={open} onOpenChange={setOpen}>
	 *   <Command.Dialog.Trigger asChild>
	 *     <Button type="button">Open Command Palette</Button>
	 *   </Command.Dialog.Trigger>
	 *   <Command.Dialog.Content>
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
	 *   </Command.Dialog.Content>
	 * </Command.Dialog.Root>
	 * ```
	 */
	Root: Dialog.Root,
	/**
	 * A button that opens the CommandDialog when clicked.
	 *
	 * @see https://mantle.ngrok.com/components/command#commanddialogtrigger
	 *
	 * @example
	 * ```tsx
	 * <Command.Dialog.Root open={open} onOpenChange={setOpen}>
	 *   <Command.Dialog.Trigger asChild>
	 *     <Button type="button">Open Command Palette</Button>
	 *   </Command.Dialog.Trigger>
	 *   <Command.Dialog.Content>
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
	 *   </Command.Dialog.Content>
	 * </Command.Dialog.Root>
	 * ```
	 */
	Trigger: Dialog.Trigger,
	/**
	 * The visible content of the CommandDialog. Renders inside the dialog portal.
	 *
	 * @see https://mantle.ngrok.com/components/command#commanddialogcontent
	 *
	 * @example
	 * ```tsx
	 * <Command.Dialog.Root open={open} onOpenChange={setOpen}>
	 *   <Command.Dialog.Trigger asChild>
	 *     <Button type="button">Open Command Palette</Button>
	 *   </Command.Dialog.Trigger>
	 *   <Command.Dialog.Content>
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
	 *   </Command.Dialog.Content>
	 * </Command.Dialog.Root>
	 * ```
	 */
	Content: CommandDialogContent,
} as const;

/**
 * The input component for the Command. It provides the input for the command palette.
 *
 * @see https://mantle.ngrok.com/components/command#commandinput
 *
 * @example
 * ```tsx
 * <Command.Dialog.Root open={open} onOpenChange={setOpen}>
 *   <Command.Dialog.Trigger asChild>
 *     <Button type="button">Open Command Palette</Button>
 *   </Command.Dialog.Trigger>
 *   <Command.Dialog.Content>
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
 *   </Command.Dialog.Content>
 * </Command.Dialog.Root>
 * ```
 */
const CommandInput = forwardRef<
	ComponentRef<"div">,
	ComponentPropsWithoutRef<typeof CommandPrimitive.Input>
>(({ className, ...props }, ref) => (
	<div
		ref={ref}
		data-slot="command-input-wrapper"
		className="flex h-9 items-center gap-2 border-b border-popover px-3"
	>
		<MagnifyingGlassIcon className="size-5 shrink-0 opacity-50" />
		<CommandPrimitive.Input
			data-slot="command-input"
			className={cx(
				"placeholder:text-muted flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-hidden disabled:cursor-not-allowed disabled:opacity-50",
				className,
			)}
			{...props}
		/>
	</div>
));
CommandInput.displayName = "CommandInput";

/**
 * The list component for the Command. It provides the list for the command palette.
 *
 * @see https://mantle.ngrok.com/components/command#commandlist
 *
 * @example
 * ```tsx
 * <Command.Dialog.Root open={open} onOpenChange={setOpen}>
 *   <Command.Dialog.Trigger asChild>
 *     <Button type="button">Open Command Palette</Button>
 *   </Command.Dialog.Trigger>
 *   <Command.Dialog.Content>
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
 *   </Command.Dialog.Content>
 * </Command.Dialog.Root>
 * ```
 */
const CommandList = forwardRef<
	ComponentRef<"div">,
	ComponentPropsWithoutRef<typeof CommandPrimitive.List>
>(({ className, ...props }, ref) => (
	<CommandPrimitive.List
		ref={ref}
		data-slot="command-list"
		className={cx("max-h-75 scroll-py-1 overflow-x-hidden overflow-y-auto scrollbar", className)}
		{...props}
	/>
));
CommandList.displayName = "CommandList";

/**
 * The empty component for the Command. It provides the empty state for the command palette.
 *
 * @see https://mantle.ngrok.com/components/command#commandempty
 *
 * @example
 * ```tsx
 * <Command.Dialog.Root open={open} onOpenChange={setOpen}>
 *   <Command.Dialog.Trigger asChild>
 *     <Button type="button">Open Command Palette</Button>
 *   </Command.Dialog.Trigger>
 *   <Command.Dialog.Content>
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
 *   </Command.Dialog.Content>
 * </Command.Dialog.Root>
 * ```
 */
const CommandEmpty = forwardRef<
	ComponentRef<"div">,
	ComponentPropsWithoutRef<typeof CommandPrimitive.Empty>
>(({ className, ...props }, ref) => (
	<CommandPrimitive.Empty
		ref={ref}
		data-slot="command-empty"
		className={cx("py-6 text-center text-sm", className)}
		{...props}
	/>
));
CommandEmpty.displayName = "CommandEmpty";

/**
 * The group component for the Command. It provides the group for the command palette.
 *
 * @see https://mantle.ngrok.com/components/command#commandgroup
 *
 * @example
 * ```tsx
 * <Command.Dialog.Root open={open} onOpenChange={setOpen}>
 *   <Command.Dialog.Trigger asChild>
 *     <Button type="button">Open Command Palette</Button>
 *   </Command.Dialog.Trigger>
 *   <Command.Dialog.Content>
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
 *   </Command.Dialog.Content>
 * </Command.Dialog.Root>
 * ```
 */
const CommandGroup = forwardRef<
	ComponentRef<"div">,
	ComponentPropsWithoutRef<typeof CommandPrimitive.Group>
>(({ className, ...props }, ref) => (
	<CommandPrimitive.Group
		ref={ref}
		data-slot="command-group"
		className={cx(
			"**:[[cmdk-group-heading]]:text-muted overflow-hidden p-1 **:[[cmdk-group-heading]]:px-2 **:[[cmdk-group-heading]]:py-1.5 **:[[cmdk-group-heading]]:text-xs **:[[cmdk-group-heading]]:font-medium",
			className,
		)}
		{...props}
	/>
));
CommandGroup.displayName = "CommandGroup";

/**
 * The separator component for the Command. It provides the separator for the command palette.
 *
 * @see https://mantle.ngrok.com/components/command#commandseparator
 *
 * @example
 * ```tsx
 * <Command.Dialog.Root open={open} onOpenChange={setOpen}>
 *   <Command.Dialog.Trigger asChild>
 *     <Button type="button">Open Command Palette</Button>
 *   </Command.Dialog.Trigger>
 *   <Command.Dialog.Content>
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
 *   </Command.Dialog.Content>
 * </Command.Dialog.Root>
 * ```
 */
const CommandSeparator = forwardRef<
	ComponentRef<typeof CommandPrimitive.Separator>,
	ComponentPropsWithoutRef<typeof CommandPrimitive.Separator>
>(({ className, ...props }, ref) => (
	<CommandPrimitive.Separator ref={ref} data-slot="command-separator" asChild {...props}>
		<Separator className={cx("-mx-1 my-1 w-auto", className)} />
	</CommandPrimitive.Separator>
));
CommandSeparator.displayName = "CommandSeparator";

/**
 * The item component for the Command. It provides the item for the command palette.
 *
 * @see https://mantle.ngrok.com/components/command#commanditem
 *
 * @example
 * ```tsx
 * <Command.Dialog.Root open={open} onOpenChange={setOpen}>
 *   <Command.Dialog.Trigger asChild>
 *     <Button type="button">Open Command Palette</Button>
 *   </Command.Dialog.Trigger>
 *   <Command.Dialog.Content>
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
 *   </Command.Dialog.Content>
 * </Command.Dialog.Root>
 * ```
 */
const CommandItem = forwardRef<
	ComponentRef<"div">,
	ComponentPropsWithoutRef<typeof CommandPrimitive.Item>
>(({ className, ...props }, ref) => (
	<CommandPrimitive.Item
		ref={ref}
		data-slot="command-item"
		className={cx(
			"data-[selected=true]:bg-active-menu-item [&_svg:not([class*='text-'])]:text-muted relative flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
			className,
		)}
		{...props}
	/>
));
CommandItem.displayName = "CommandItem";

/**
 * The shortcut component for the Command. It provides the shortcut for the command palette.
 *
 * @see https://mantle.ngrok.com/components/command#commandshortcut
 *
 * @example
 * ```tsx
 * <Command.Dialog.Root open={open} onOpenChange={setOpen}>
 *   <Command.Dialog.Trigger asChild>
 *     <Button type="button">Open Command Palette</Button>
 *   </Command.Dialog.Trigger>
 *   <Command.Dialog.Content>
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
 *   </Command.Dialog.Content>
 * </Command.Dialog.Root>
 * ```
 */
const CommandShortcut = forwardRef<ComponentRef<"span">, ComponentPropsWithoutRef<"span">>(
	({ className, ...props }, ref) => (
		<span
			ref={ref}
			data-slot="command-shortcut"
			className={cx("text-muted ml-auto text-xs tracking-widest", className)}
			{...props}
		/>
	),
);
CommandShortcut.displayName = "CommandShortcut";

/**
 * The command component for the Command. It provides the command for the command palette.
 *
 * @see https://mantle.ngrok.com/components/command
 *
 * @example
 * Composition:
 * ```
 * Command.Dialog.Root
 * ├── Command.Dialog.Trigger
 * └── Command.Dialog.Content
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
 * <Command.Dialog.Root open={open} onOpenChange={setOpen}>
 *   <Command.Dialog.Trigger asChild>
 *     <Button type="button">Open Command Palette</Button>
 *   </Command.Dialog.Trigger>
 *   <Command.Dialog.Content>
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
 *   </Command.Dialog.Content>
 * </Command.Dialog.Root>
 * ```
 */
const Command = {
	/**
	 * The root component for the Command component.
	 *
	 * @see https://mantle.ngrok.com/components/command#commandroot
	 *
	 * @example
	 * ```tsx
	 * <Command.Dialog.Root open={open} onOpenChange={setOpen}>
	 *   <Command.Dialog.Trigger asChild>
	 *     <Button type="button">Open Command Palette</Button>
	 *   </Command.Dialog.Trigger>
	 *   <Command.Dialog.Content>
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
	 *   </Command.Dialog.Content>
	 * </Command.Dialog.Root>
	 * ```
	 */
	Root: CommandRoot,
	/**
	 * A compound namespace for building a command palette dialog.
	 * Use `Command.Dialog.Root`, `Command.Dialog.Trigger`, and `Command.Dialog.Content`.
	 *
	 * @see https://mantle.ngrok.com/components/command#commanddialog
	 *
	 * @example
	 * ```tsx
	 * <Command.Dialog.Root open={open} onOpenChange={setOpen}>
	 *   <Command.Dialog.Trigger asChild>
	 *     <Button type="button">Open Command Palette</Button>
	 *   </Command.Dialog.Trigger>
	 *   <Command.Dialog.Content>
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
	 *   </Command.Dialog.Content>
	 * </Command.Dialog.Root>
	 * ```
	 */
	Dialog: CommandDialog,
	/**
	 * The input component for the Command component.
	 *
	 * @see https://mantle.ngrok.com/components/command#commandinput
	 *
	 * @example
	 * ```tsx
	 * <Command.Dialog.Root open={open} onOpenChange={setOpen}>
	 *   <Command.Dialog.Trigger asChild>
	 *     <Button type="button">Open Command Palette</Button>
	 *   </Command.Dialog.Trigger>
	 *   <Command.Dialog.Content>
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
	 *   </Command.Dialog.Content>
	 * </Command.Dialog.Root>
	 * ```
	 */
	Input: CommandInput,
	/**
	 * The list component for the Command component.
	 *
	 * @see https://mantle.ngrok.com/components/command#commandlist
	 *
	 * @example
	 * ```tsx
	 * <Command.Dialog.Root open={open} onOpenChange={setOpen}>
	 *   <Command.Dialog.Trigger asChild>
	 *     <Button type="button">Open Command Palette</Button>
	 *   </Command.Dialog.Trigger>
	 *   <Command.Dialog.Content>
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
	 *   </Command.Dialog.Content>
	 * </Command.Dialog.Root>
	 * ```
	 */
	List: CommandList,
	/**
	 * The empty component for the Command component.
	 *
	 * @see https://mantle.ngrok.com/components/command#commandempty
	 *
	 * @example
	 * ```tsx
	 * <Command.Dialog.Root open={open} onOpenChange={setOpen}>
	 *   <Command.Dialog.Trigger asChild>
	 *     <Button type="button">Open Command Palette</Button>
	 *   </Command.Dialog.Trigger>
	 *   <Command.Dialog.Content>
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
	 *   </Command.Dialog.Content>
	 * </Command.Dialog.Root>
	 * ```
	 */
	Empty: CommandEmpty,
	/**
	 * The group component for the Command component.
	 *
	 * @see https://mantle.ngrok.com/components/command#commandgroup
	 *
	 * @example
	 * ```tsx
	 * <Command.Dialog.Root open={open} onOpenChange={setOpen}>
	 *   <Command.Dialog.Trigger asChild>
	 *     <Button type="button">Open Command Palette</Button>
	 *   </Command.Dialog.Trigger>
	 *   <Command.Dialog.Content>
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
	 *   </Command.Dialog.Content>
	 * </Command.Dialog.Root>
	 * ```
	 */
	Group: CommandGroup,
	/**
	 * The item component for the Command component.
	 *
	 * @see https://mantle.ngrok.com/components/command#commanditem
	 *
	 * @example
	 * ```tsx
	 * <Command.Dialog.Root open={open} onOpenChange={setOpen}>
	 *   <Command.Dialog.Trigger asChild>
	 *     <Button type="button">Open Command Palette</Button>
	 *   </Command.Dialog.Trigger>
	 *   <Command.Dialog.Content>
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
	 *   </Command.Dialog.Content>
	 * </Command.Dialog.Root>
	 * ```
	 */
	Item: CommandItem,
	/**
	 * The shortcut component for the Command component.
	 *
	 * @see https://mantle.ngrok.com/components/command#commandshortcut
	 *
	 * @example
	 * ```tsx
	 * <Command.Dialog.Root open={open} onOpenChange={setOpen}>
	 *   <Command.Dialog.Trigger asChild>
	 *     <Button type="button">Open Command Palette</Button>
	 *   </Command.Dialog.Trigger>
	 *   <Command.Dialog.Content>
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
	 *   </Command.Dialog.Content>
	 * </Command.Dialog.Root>
	 * ```
	 */
	Shortcut: CommandShortcut,
	/**
	 * The separator component for the Command component.
	 *
	 * @see https://mantle.ngrok.com/components/command#commandseparator
	 *
	 * @example
	 * ```tsx
	 * <Command.Dialog.Root open={open} onOpenChange={setOpen}>
	 *   <Command.Dialog.Trigger asChild>
	 *     <Button type="button">Open Command Palette</Button>
	 *   </Command.Dialog.Trigger>
	 *   <Command.Dialog.Content>
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
	 *   </Command.Dialog.Content>
	 * </Command.Dialog.Root>
	 * ```
	 */
	Separator: CommandSeparator,
} as const;

export {
	//,
	Command,
	useCommandState,
};
