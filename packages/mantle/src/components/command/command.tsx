"use client";

import { MagnifyingGlassIcon } from "@phosphor-icons/react/MagnifyingGlass";
import { Command as CommandPrimitive, useCommandState } from "cmdk";

import type { ComponentProps, ComponentPropsWithoutRef, ReactNode, Ref } from "react";
import { cx } from "../../utils/cx/cx.js";
import { Dialog } from "../dialog/dialog.js";
import { Separator } from "../separator/separator.js";

type CommandRootProps = ComponentProps<typeof CommandPrimitive>;

/**
 * The root component for the Command. It provides the context for all other command sub-components.
 *
 * @see https://mantle.ngrok.com/components/navigation/command#commandroot
 *
 * @example
 * ```tsx
 * <Command.DialogRoot open={open} onOpenChange={setOpen}>
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
const CommandRoot = ({ className, ...props }: CommandRootProps) => (
	<CommandPrimitive
		data-slot="command"
		className={cx("bg-popover flex h-full w-full flex-col overflow-hidden rounded-md", className)}
		{...props}
	/>
);

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
 * <Command.DialogRoot open={open} onOpenChange={setOpen}>
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

/**
 * The input component for the Command. It provides the input for the command palette.
 *
 * @see https://mantle.ngrok.com/components/navigation/command#commandinput
 *
 * @example
 * ```tsx
 * <Command.DialogRoot open={open} onOpenChange={setOpen}>
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
const CommandInput = ({
	className,
	ref,
	...props
}: ComponentPropsWithoutRef<typeof CommandPrimitive.Input> & {
	ref?: Ref<HTMLDivElement>;
}) => (
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
);

/**
 * The list component for the Command. It provides the list for the command palette.
 *
 * @see https://mantle.ngrok.com/components/navigation/command#commandlist
 *
 * @example
 * ```tsx
 * <Command.DialogRoot open={open} onOpenChange={setOpen}>
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
const CommandList = ({ className, ...props }: ComponentProps<typeof CommandPrimitive.List>) => (
	<CommandPrimitive.List
		data-slot="command-list"
		className={cx("max-h-75 scroll-py-1 overflow-x-hidden overflow-y-auto scrollbar", className)}
		{...props}
	/>
);

/**
 * The empty component for the Command. It provides the empty state for the command palette.
 *
 * @see https://mantle.ngrok.com/components/navigation/command#commandempty
 *
 * @example
 * ```tsx
 * <Command.DialogRoot open={open} onOpenChange={setOpen}>
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
const CommandEmpty = ({ className, ...props }: ComponentProps<typeof CommandPrimitive.Empty>) => (
	<CommandPrimitive.Empty
		data-slot="command-empty"
		className={cx("py-6 text-center text-sm", className)}
		{...props}
	/>
);

/**
 * The group component for the Command. It provides the group for the command palette.
 *
 * @see https://mantle.ngrok.com/components/navigation/command#commandgroup
 *
 * @example
 * ```tsx
 * <Command.DialogRoot open={open} onOpenChange={setOpen}>
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
 * The separator component for the Command. It provides the separator for the command palette.
 *
 * @see https://mantle.ngrok.com/components/navigation/command#commandseparator
 *
 * @example
 * ```tsx
 * <Command.DialogRoot open={open} onOpenChange={setOpen}>
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
const CommandSeparator = ({
	className,
	...props
}: ComponentProps<typeof CommandPrimitive.Separator>) => (
	<CommandPrimitive.Separator data-slot="command-separator" asChild {...props}>
		<Separator className={cx("-mx-1 my-1 w-auto", className)} />
	</CommandPrimitive.Separator>
);

/**
 * The item component for the Command. It provides the item for the command palette.
 *
 * @see https://mantle.ngrok.com/components/navigation/command#commanditem
 *
 * @example
 * ```tsx
 * <Command.DialogRoot open={open} onOpenChange={setOpen}>
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
 * The shortcut component for the Command. It provides the shortcut for the command palette.
 *
 * @see https://mantle.ngrok.com/components/navigation/command#commandshortcut
 *
 * @example
 * ```tsx
 * <Command.DialogRoot open={open} onOpenChange={setOpen}>
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
const CommandShortcut = ({ className, ...props }: ComponentProps<"span">) => (
	<span
		data-slot="command-shortcut"
		className={cx("text-muted ml-auto text-xs tracking-widest", className)}
		{...props}
	/>
);

/**
 * The command component for the Command. It provides the command for the command palette.
 *
 * @see https://mantle.ngrok.com/components/navigation/command
 *
 * @example
 * Composition:
 * ```
 * Command.DialogRoot
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
 * <Command.DialogRoot open={open} onOpenChange={setOpen}>
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
const Command = {
	/**
	 * The root component for the Command component.
	 *
	 * @see https://mantle.ngrok.com/components/navigation/command#commandroot
	 *
	 * @example
	 * ```tsx
	 * <Command.DialogRoot open={open} onOpenChange={setOpen}>
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
	Root: CommandRoot,
	/**
	 * The root stateful component for the Command dialog. Manages open/closed state.
	 *
	 * @see https://mantle.ngrok.com/components/navigation/command#commanddialogroot
	 *
	 * @example
	 * ```tsx
	 * <Command.DialogRoot open={open} onOpenChange={setOpen}>
	 *   <Command.DialogTrigger asChild>
	 *     <Button type="button" appearance="outlined" intent="neutral">Open Command Palette</Button>
	 *   </Command.DialogTrigger>
	 *   <Command.DialogContent>
	 *     <Command.Input placeholder="Type a command or search..." />
	 *     <Command.List>
	 *       <Command.Empty>No results found.</Command.Empty>
	 *     </Command.List>
	 *   </Command.DialogContent>
	 * </Command.DialogRoot>
	 * ```
	 */
	DialogRoot: Dialog.Root,
	/**
	 * A button that opens the Command dialog when clicked.
	 *
	 * @see https://mantle.ngrok.com/components/navigation/command#commanddialogtrigger
	 *
	 * @example
	 * ```tsx
	 * <Command.DialogTrigger asChild>
	 *   <Button type="button" appearance="outlined" intent="neutral">Open Command Palette</Button>
	 * </Command.DialogTrigger>
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
	 * <Command.DialogContent>
	 *   <Command.Input placeholder="Type a command or search..." />
	 *   <Command.List>
	 *     <Command.Empty>No results found.</Command.Empty>
	 *   </Command.List>
	 * </Command.DialogContent>
	 * ```
	 */
	DialogContent: CommandDialogContent,
	/**
	 * The input component for the Command component.
	 *
	 * @see https://mantle.ngrok.com/components/navigation/command#commandinput
	 *
	 * @example
	 * ```tsx
	 * <Command.DialogRoot open={open} onOpenChange={setOpen}>
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
	Input: CommandInput,
	/**
	 * The list component for the Command component.
	 *
	 * @see https://mantle.ngrok.com/components/navigation/command#commandlist
	 *
	 * @example
	 * ```tsx
	 * <Command.DialogRoot open={open} onOpenChange={setOpen}>
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
	List: CommandList,
	/**
	 * The empty component for the Command component.
	 *
	 * @see https://mantle.ngrok.com/components/navigation/command#commandempty
	 *
	 * @example
	 * ```tsx
	 * <Command.DialogRoot open={open} onOpenChange={setOpen}>
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
	Empty: CommandEmpty,
	/**
	 * The group component for the Command component.
	 *
	 * @see https://mantle.ngrok.com/components/navigation/command#commandgroup
	 *
	 * @example
	 * ```tsx
	 * <Command.DialogRoot open={open} onOpenChange={setOpen}>
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
	Group: CommandGroup,
	/**
	 * The item component for the Command component.
	 *
	 * @see https://mantle.ngrok.com/components/navigation/command#commanditem
	 *
	 * @example
	 * ```tsx
	 * <Command.DialogRoot open={open} onOpenChange={setOpen}>
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
	Item: CommandItem,
	/**
	 * The shortcut component for the Command component.
	 *
	 * @see https://mantle.ngrok.com/components/navigation/command#commandshortcut
	 *
	 * @example
	 * ```tsx
	 * <Command.DialogRoot open={open} onOpenChange={setOpen}>
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
	Shortcut: CommandShortcut,
	/**
	 * The separator component for the Command component.
	 *
	 * @see https://mantle.ngrok.com/components/navigation/command#commandseparator
	 *
	 * @example
	 * ```tsx
	 * <Command.DialogRoot open={open} onOpenChange={setOpen}>
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
	Separator: CommandSeparator,
} as const;

export {
	//,
	Command,
	useCommandState,
};
