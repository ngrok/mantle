import { CaretRightIcon } from "@phosphor-icons/react/CaretRight";
import { CheckIcon } from "@phosphor-icons/react/Check";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import type { ComponentProps } from "react";
import { cx } from "../../utils/cx/cx.js";
import type { WithDataSlot } from "../../utils/data-slot.js";
import { joinDataSlot } from "../../utils/data-slot.js";
import { Icon } from "../icon/icon.js";
import { Separator } from "../separator/separator.js";

/**
 * A menu of options or actions, triggered by a button.
 * This is the root, stateful component that manages the open/closed state of the dropdown menu.
 *
 * `DropdownMenu.Content` and `DropdownMenu.SubContent` render at Tailwind
 * `z-50`, Mantle's shared floating z-index. When multiple shared layers are
 * open, the most recently mounted layer renders on top.
 *
 * @see https://mantle.ngrok.com/components/overlays/dropdown-menu#dropdownmenuroot
 *
 * @example
 * ```tsx
 * <DropdownMenu.Root>
 *   <DropdownMenu.Trigger asChild>
 *     <Button type="button" appearance="outlined" intent="neutral">
 *       Open Menu
 *     </Button>
 *   </DropdownMenu.Trigger>
 *   <DropdownMenu.Content>
 *     <DropdownMenu.Item>Item 1</DropdownMenu.Item>
 *     <DropdownMenu.Item>Item 2</DropdownMenu.Item>
 *   </DropdownMenu.Content>
 * </DropdownMenu.Root>
 * ```
 */
const Root = DropdownMenuPrimitive.Root;

/**
 * The trigger button that opens the dropdown menu.
 *
 * @see https://mantle.ngrok.com/components/overlays/dropdown-menu#dropdownmenutrigger
 *
 * @example
 * ```tsx
 * <DropdownMenu.Root>
 *   <DropdownMenu.Trigger asChild>
 *     <Button type="button" appearance="outlined" intent="neutral">
 *       Open Menu
 *     </Button>
 *   </DropdownMenu.Trigger>
 *   <DropdownMenu.Content>
 *     <DropdownMenu.Item>Item 1</DropdownMenu.Item>
 *   </DropdownMenu.Content>
 * </DropdownMenu.Root>
 * ```
 */
const Trigger = (props: ComponentProps<typeof DropdownMenuPrimitive.Trigger>) => (
	<DropdownMenuPrimitive.Trigger data-slot="dropdown-menu-trigger" {...props} />
);

/**
 * A group container for organizing related dropdown menu items.
 *
 * @see https://mantle.ngrok.com/components/overlays/dropdown-menu#dropdownmenugroup
 *
 * @example
 * ```tsx
 * <DropdownMenu.Root>
 *   <DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
 *   <DropdownMenu.Content>
 *     <DropdownMenu.Group>
 *       <DropdownMenu.Label>Account</DropdownMenu.Label>
 *       <DropdownMenu.Item>Profile</DropdownMenu.Item>
 *       <DropdownMenu.Item>Settings</DropdownMenu.Item>
 *     </DropdownMenu.Group>
 *   </DropdownMenu.Content>
 * </DropdownMenu.Root>
 * ```
 */
const Group = ({ className, ...props }: ComponentProps<typeof DropdownMenuPrimitive.Group>) => (
	<DropdownMenuPrimitive.Group
		data-slot="dropdown-menu-group"
		className={cx("space-y-px", className)}
		{...props}
	/>
);

/**
 * The portal container for rendering dropdown content outside the normal DOM tree.
 */
const Portal = DropdownMenuPrimitive.Portal;

/**
 * A submenu container for creating nested dropdown menus.
 *
 * @see https://mantle.ngrok.com/components/overlays/dropdown-menu#dropdownmenusub
 *
 * @example
 * ```tsx
 * <DropdownMenu.Root>
 *   <DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
 *   <DropdownMenu.Content>
 *     <DropdownMenu.Sub>
 *       <DropdownMenu.SubTrigger>More options</DropdownMenu.SubTrigger>
 *       <DropdownMenu.SubContent>
 *         <DropdownMenu.Item>Sub item 1</DropdownMenu.Item>
 *         <DropdownMenu.Item>Sub item 2</DropdownMenu.Item>
 *       </DropdownMenu.SubContent>
 *     </DropdownMenu.Sub>
 *   </DropdownMenu.Content>
 * </DropdownMenu.Root>
 * ```
 */
const Sub = DropdownMenuPrimitive.Sub;

/**
 * A radio group container for exclusive selection within the dropdown menu.
 *
 * @see https://mantle.ngrok.com/components/overlays/dropdown-menu#dropdownmenuradiogroup
 *
 * @example
 * ```tsx
 * <DropdownMenu.Root>
 *   <DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
 *   <DropdownMenu.Content>
 *     <DropdownMenu.RadioGroup value={value} onValueChange={setValue}>
 *       <DropdownMenu.RadioItem value="option1">Option 1</DropdownMenu.RadioItem>
 *       <DropdownMenu.RadioItem value="option2">Option 2</DropdownMenu.RadioItem>
 *     </DropdownMenu.RadioGroup>
 *   </DropdownMenu.Content>
 * </DropdownMenu.Root>
 * ```
 */
const RadioGroup = ({
	className,
	...props
}: ComponentProps<typeof DropdownMenuPrimitive.RadioGroup>) => (
	<DropdownMenuPrimitive.RadioGroup
		data-slot="dropdown-menu-radio-group"
		className={cx("space-y-px", className)}
		{...props}
	/>
);

/**
 * A trigger for a dropdown menu sub-menu.
 *
 * @see https://mantle.ngrok.com/components/overlays/dropdown-menu#dropdownmenusubtrigger
 *
 * @example
 * ```tsx
 * <DropdownMenu.Root>
 *   <DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
 *   <DropdownMenu.Content>
 *     <DropdownMenu.Sub>
 *       <DropdownMenu.SubTrigger>Share</DropdownMenu.SubTrigger>
 *       <DropdownMenu.SubContent>
 *         <DropdownMenu.Item>Email</DropdownMenu.Item>
 *         <DropdownMenu.Item>Copy link</DropdownMenu.Item>
 *       </DropdownMenu.SubContent>
 *     </DropdownMenu.Sub>
 *   </DropdownMenu.Content>
 * </DropdownMenu.Root>
 * ```
 */
const SubTrigger = ({
	className,
	inset,
	children,
	...props
}: ComponentProps<typeof DropdownMenuPrimitive.SubTrigger> & {
	inset?: boolean;
}) => (
	<DropdownMenuPrimitive.SubTrigger
		data-slot="dropdown-menu-sub-trigger"
		className={cx(
			"focus:bg-accent data-state-open:bg-accent relative flex select-none items-center rounded-md py-1.5 pl-2 pr-9 text-sm outline-hidden",
			"data-highlighted:bg-active-menu-item data-state-open:bg-active-menu-item",
			"[&>svg]:size-5 [&_svg]:shrink-0",
			inset && "pl-8",
			className,
		)}
		{...props}
	>
		{children}
		<span className="absolute right-2 flex items-center">
			<Icon svg={<CaretRightIcon weight="bold" />} className="size-4" />
		</span>
	</DropdownMenuPrimitive.SubTrigger>
);

/**
 * The content container for a dropdown menu sub-menu.
 *
 * `DropdownMenu.SubContent` renders at Tailwind `z-50`, Mantle's shared
 * floating z-index. When multiple shared layers are open, the most recently
 * mounted layer renders on top.
 *
 * @see https://mantle.ngrok.com/components/overlays/dropdown-menu#dropdownmenusubcontent
 *
 * @example
 * ```tsx
 * <DropdownMenu.Root>
 *   <DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
 *   <DropdownMenu.Content>
 *     <DropdownMenu.Sub>
 *       <DropdownMenu.SubTrigger>Export</DropdownMenu.SubTrigger>
 *       <DropdownMenu.SubContent>
 *         <DropdownMenu.Item>Export as PDF</DropdownMenu.Item>
 *         <DropdownMenu.Item>Export as CSV</DropdownMenu.Item>
 *       </DropdownMenu.SubContent>
 *     </DropdownMenu.Sub>
 *   </DropdownMenu.Content>
 * </DropdownMenu.Root>
 * ```
 */
const SubContent = ({
	className,
	loop = true,
	...props
}: ComponentProps<typeof DropdownMenuPrimitive.SubContent>) => (
	<Portal>
		<DropdownMenuPrimitive.SubContent
			data-slot="dropdown-menu-sub-content"
			className={cx(
				"scrollbar",
				"text-popover-foreground border-popover bg-popover p-1.25 data-state-closed:animate-out data-state-closed:fade-out-0 data-state-closed:zoom-out-95 data-state-open:animate-in data-state-open:fade-in-0 data-state-open:zoom-in-95 data-side-bottom:slide-in-from-top-2 data-side-left:slide-in-from-right-2 data-side-right:slide-in-from-left-2 data-side-top:slide-in-from-bottom-2 z-50 min-w-32 overflow-hidden rounded-md border shadow-xl space-y-px font-sans",
				"my-2 max-h-[calc(var(--radix-dropdown-menu-content-available-height)-16px)] overflow-auto",
				className,
			)}
			loop={loop}
			{...props}
		/>
	</Portal>
);

type DropdownMenuContentProps = ComponentProps<typeof DropdownMenuPrimitive.Content> &
	WithDataSlot & {
		/**
		 * Whether the DropdownMenuContent should match the width of the trigger or use the intrinsic content width.
		 */
		width?: "trigger" | "content";
	};

/**
 * The container for the dropdown menu content.
 *
 * `DropdownMenu.Content` renders at Tailwind `z-50`, Mantle's shared floating
 * z-index. When multiple shared layers are open, the most recently mounted
 * layer renders on top.
 *
 * @see https://mantle.ngrok.com/components/overlays/dropdown-menu#dropdownmenucontent
 *
 * @example
 * ```tsx
 * <DropdownMenu.Root>
 *   <DropdownMenu.Trigger asChild>
 *     <Button type="button" appearance="outlined" intent="neutral">
 *       Open Menu
 *     </Button>
 *   </DropdownMenu.Trigger>
 *   <DropdownMenu.Content>
 *     <DropdownMenu.Item>Item 1</DropdownMenu.Item>
 *     <DropdownMenu.Item>Item 2</DropdownMenu.Item>
 *   </DropdownMenu.Content>
 * </DropdownMenu.Root>
 * ```
 */
const Content = ({
	className,
	"data-slot": dataSlot,
	onClick,
	loop = true,
	width,
	...props
}: DropdownMenuContentProps) => (
	<Portal>
		<DropdownMenuPrimitive.Content
			data-slot={joinDataSlot(dataSlot, "dropdown-menu-content")}
			className={cx(
				"scrollbar",
				"text-popover-foreground border-popover bg-popover p-1.25 z-50 min-w-32 overflow-hidden rounded-md border shadow-xl outline-hidden space-y-px font-sans",
				"data-side-bottom:slide-in-from-top-2 data-side-left:slide-in-from-right-2 data-side-right:slide-in-from-left-2 data-side-top:slide-in-from-bottom-2 data-state-closed:animate-out data-state-closed:fade-out-0 data-state-closed:zoom-out-95 data-state-open:animate-in data-state-open:fade-in-0 data-state-open:zoom-in-95",
				"my-2 max-h-[calc(var(--radix-dropdown-menu-content-available-height)-16px)] overflow-auto",
				width === "trigger" && "w-(--radix-dropdown-menu-trigger-width)",
				className,
			)}
			loop={loop}
			onClick={(event) => {
				/**
				 * Prevent the click event from propagating up to parent/containing elements
				 * of the DropdownMenu
				 */
				event.stopPropagation();
				onClick?.(event);
			}}
			{...props}
		/>
	</Portal>
);

/**
 * An item in the dropdown menu.
 *
 * @see https://mantle.ngrok.com/components/overlays/dropdown-menu#dropdownmenuitem
 *
 * @example
 * ```tsx
 * <DropdownMenu.Root>
 *   <DropdownMenu.Trigger asChild>
 *     <Button type="button" appearance="outlined" intent="neutral">
 *       Open Menu
 *     </Button>
 *   </DropdownMenu.Trigger>
 *   <DropdownMenu.Content>
 *     <DropdownMenu.Item>Item 1</DropdownMenu.Item>
 *     <DropdownMenu.Item>Item 2</DropdownMenu.Item>
 *   </DropdownMenu.Content>
 * </DropdownMenu.Root>
 * ```
 */
const Item = ({
	className,
	inset,
	...props
}: ComponentProps<typeof DropdownMenuPrimitive.Item> & {
	inset?: boolean;
}) => (
	<DropdownMenuPrimitive.Item
		data-slot="dropdown-menu-item"
		className={cx(
			"relative flex cursor-pointer select-none items-center rounded-md px-2 py-1.5 text-strong text-sm font-normal outline-hidden transition-colors",
			"data-highlighted:bg-active-menu-item",
			"focus:bg-accent focus:text-accent-foreground",
			"data-disabled:cursor-default data-disabled:opacity-50",
			"[&>svg]:size-5 [&_svg]:shrink-0",
			inset && "pl-8",
			className,
		)}
		{...props}
	/>
);

/**
 * A menu item with a checkbox that can be controlled or uncontrolled.
 *
 * @see https://mantle.ngrok.com/components/overlays/dropdown-menu#dropdownmenucheckboxitem
 *
 * @example
 * ```tsx
 * <DropdownMenu.Root>
 *   <DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
 *   <DropdownMenu.Content>
 *     <DropdownMenu.CheckboxItem checked={true} onCheckedChange={setChecked}>
 *       Show notifications
 *     </DropdownMenu.CheckboxItem>
 *   </DropdownMenu.Content>
 * </DropdownMenu.Root>
 * ```
 */
const CheckboxItem = ({
	className,
	children,
	checked,
	...props
}: ComponentProps<typeof DropdownMenuPrimitive.CheckboxItem>) => (
	<DropdownMenuPrimitive.CheckboxItem
		data-slot="dropdown-menu-checkbox-item"
		className={cx(
			"text-strong data-disabled:pointer-events-none data-disabled:opacity-50 relative flex cursor-pointer select-none items-center gap-2 rounded-md py-1.5 pl-2 pr-9 text-sm font-normal outline-hidden",
			"data-highlighted:bg-active-menu-item",
			"aria-checked:bg-selected-menu-item",
			"data-highlighted:aria-checked:bg-active-selected-menu-item!",
			"[&>svg]:size-5 [&_svg]:shrink-0",
			className,
		)}
		checked={checked}
		{...props}
	>
		<span className="absolute right-2 flex items-center">
			<DropdownMenuPrimitive.ItemIndicator>
				<Icon svg={<CheckIcon weight="bold" />} className="size-4 text-accent-600" />
			</DropdownMenuPrimitive.ItemIndicator>
		</span>
		{children}
	</DropdownMenuPrimitive.CheckboxItem>
);

type DropdownMenuRadioItemProps = ComponentProps<typeof DropdownMenuPrimitive.RadioItem> & {
	name?: string;
	id?: string;
};

/**
 * A menu item with a radio button that can be controlled or uncontrolled.
 * Used within a RadioGroup to create a set of mutually exclusive options.
 *
 * @see https://mantle.ngrok.com/components/overlays/dropdown-menu#dropdownmenuradioitem
 *
 * @example
 * ```tsx
 * <DropdownMenu.Root>
 *   <DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
 *   <DropdownMenu.Content>
 *     <DropdownMenu.RadioGroup value="small" onValueChange={setSize}>
 *       <DropdownMenu.RadioItem value="small">Small</DropdownMenu.RadioItem>
 *       <DropdownMenu.RadioItem value="medium">Medium</DropdownMenu.RadioItem>
 *       <DropdownMenu.RadioItem value="large">Large</DropdownMenu.RadioItem>
 *     </DropdownMenu.RadioGroup>
 *   </DropdownMenu.Content>
 * </DropdownMenu.Root>
 * ```
 */
const RadioItem = ({ className, children, ...props }: DropdownMenuRadioItemProps) => (
	<DropdownMenuPrimitive.RadioItem
		data-slot="dropdown-menu-radio-item"
		className={cx(
			"group/dropdown-menu-radio-item",
			"text-strong data-disabled:pointer-events-none data-disabled:opacity-50 relative flex cursor-pointer select-none items-center gap-2 rounded-md py-1.5 px-2 text-sm font-normal outline-none",
			"data-highlighted:bg-active-menu-item",
			"aria-checked:bg-selected-menu-item aria-checked:pr-9",
			"data-highlighted:aria-checked:bg-active-selected-menu-item!",
			"[&>svg]:size-5 [&_svg]:shrink-0",
			className,
		)}
		{...props}
	>
		<span className="absolute right-2 items-center hidden group-aria-checked/dropdown-menu-radio-item:flex">
			<DropdownMenuPrimitive.ItemIndicator>
				<Icon svg={<CheckIcon weight="bold" />} className="size-4 text-accent-600" />
			</DropdownMenuPrimitive.ItemIndicator>
		</span>
		{children}
	</DropdownMenuPrimitive.RadioItem>
);

/**
 * A label for a group of dropdown menu items.
 *
 * @see https://mantle.ngrok.com/components/overlays/dropdown-menu#dropdownmenulabel
 *
 * @example
 * ```tsx
 * <DropdownMenu.Root>
 *   <DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
 *   <DropdownMenu.Content>
 *     <DropdownMenu.Label>My Account</DropdownMenu.Label>
 *     <DropdownMenu.Item>Profile</DropdownMenu.Item>
 *     <DropdownMenu.Item>Settings</DropdownMenu.Item>
 *   </DropdownMenu.Content>
 * </DropdownMenu.Root>
 * ```
 */
const Label = ({
	className,
	inset,
	...props
}: ComponentProps<typeof DropdownMenuPrimitive.Label> & {
	inset?: boolean;
}) => (
	<DropdownMenuPrimitive.Label
		data-slot="dropdown-menu-label"
		className={cx("px-2 py-1.5 text-sm font-medium", inset && "pl-8", className)}
		{...props}
	/>
);

/**
 * A visual separator between dropdown menu items or groups.
 *
 * @see https://mantle.ngrok.com/components/overlays/dropdown-menu#dropdownmenuseparator
 *
 * @example
 * ```tsx
 * <DropdownMenu.Root>
 *   <DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
 *   <DropdownMenu.Content>
 *     <DropdownMenu.Item>Edit</DropdownMenu.Item>
 *     <DropdownMenu.Item>Copy</DropdownMenu.Item>
 *     <DropdownMenu.Separator />
 *     <DropdownMenu.Item>Delete</DropdownMenu.Item>
 *   </DropdownMenu.Content>
 * </DropdownMenu.Root>
 * ```
 */
const DropdownSeparator = ({ className, ...props }: ComponentProps<typeof Separator>) => (
	<Separator
		data-slot="dropdown-menu-separator"
		className={cx("-mx-1.25 my-1 w-auto", className)}
		{...props}
	/>
);

/**
 * A keyboard shortcut indicator for dropdown menu items.
 *
 * @see https://mantle.ngrok.com/components/overlays/dropdown-menu#dropdownmenushortcut
 *
 * @example
 * ```tsx
 * <DropdownMenu.Root>
 *   <DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
 *   <DropdownMenu.Content>
 *     <DropdownMenu.Item>
 *       Save
 *       <DropdownMenu.Shortcut>⌘S</DropdownMenu.Shortcut>
 *     </DropdownMenu.Item>
 *   </DropdownMenu.Content>
 * </DropdownMenu.Root>
 * ```
 */
const Shortcut = ({ className, ...props }: ComponentProps<"span">) => {
	return (
		<span
			data-slot="dropdown-menu-shortcut"
			className={cx("ml-auto text-xs tracking-widest opacity-60", className)}
			{...props}
		/>
	);
};

/**
 * A menu of options or actions, triggered by a button.
 *
 * `DropdownMenu.Content` and `DropdownMenu.SubContent` render at Tailwind
 * `z-50`, Mantle's shared floating z-index. When multiple shared layers are
 * open, the most recently mounted layer renders on top.
 *
 * @see https://mantle.ngrok.com/components/overlays/dropdown-menu
 *
 * @example
 * Composition:
 * ```
 * DropdownMenu.Root
 * ├── DropdownMenu.Trigger
 * └── DropdownMenu.Content
 *     ├── DropdownMenu.Group
 *     │   ├── DropdownMenu.Label
 *     │   ├── DropdownMenu.Item
 *     │   │   └── DropdownMenu.Shortcut
 *     │   ├── DropdownMenu.CheckboxItem
 *     │   └── DropdownMenu.RadioGroup
 *     │       └── DropdownMenu.RadioItem
 *     ├── DropdownMenu.Separator
 *     └── DropdownMenu.Sub
 *         ├── DropdownMenu.SubTrigger
 *         └── DropdownMenu.SubContent
 * ```
 *
 * @example
 * ```tsx
 * <DropdownMenu.Root>
 *   <DropdownMenu.Trigger asChild>
 *     <Button type="button" appearance="outlined" intent="neutral">
 *       Open Menu
 *     </Button>
 *   </DropdownMenu.Trigger>
 *   <DropdownMenu.Content>
 *     <DropdownMenu.Item>Item 1</DropdownMenu.Item>
 *     <DropdownMenu.Item>Item 2</DropdownMenu.Item>
 *   </DropdownMenu.Content>
 * </DropdownMenu.Root>
 * ```
 */
const DropdownMenu = {
	/**
	 * The root, stateful component that manages the open/closed state of the dropdown menu.
	 *
	 * `DropdownMenu.Content` and `DropdownMenu.SubContent` render at Tailwind
	 * `z-50`, Mantle's shared floating z-index. When multiple shared layers are
	 * open, the most recently mounted layer renders on top.
	 *
	 * @see https://mantle.ngrok.com/components/overlays/dropdown-menu#dropdownmenuroot
	 *
	 * @example
	 * ```tsx
	 * <DropdownMenu.Root>
	 *   <DropdownMenu.Trigger asChild>
	 *     <Button type="button" appearance="outlined" intent="neutral">
	 *       Open Menu
	 *     </Button>
	 *   </DropdownMenu.Trigger>
	 *   <DropdownMenu.Content>
	 *     <DropdownMenu.Item>Item 1</DropdownMenu.Item>
	 *   </DropdownMenu.Content>
	 * </DropdownMenu.Root>
	 * ```
	 */
	Root,
	/**
	 * A checkbox item in the dropdown menu that can be toggled on and off.
	 *
	 * @see https://mantle.ngrok.com/components/overlays/dropdown-menu#dropdownmenucheckboxitem
	 *
	 * @example
	 * ```tsx
	 * <DropdownMenu.Root>
	 *   <DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
	 *   <DropdownMenu.Content>
	 *     <DropdownMenu.CheckboxItem checked={true} onCheckedChange={setChecked}>
	 *       Show notifications
	 *     </DropdownMenu.CheckboxItem>
	 *   </DropdownMenu.Content>
	 * </DropdownMenu.Root>
	 * ```
	 */
	CheckboxItem,
	/**
	 * The container for the dropdown menu content. Appears in a portal with scrolling and animations.
	 *
	 * `DropdownMenu.Content` renders at Tailwind `z-50`, Mantle's shared
	 * floating z-index. When multiple shared layers are open, the most recently
	 * mounted layer renders on top.
	 *
	 * @see https://mantle.ngrok.com/components/overlays/dropdown-menu#dropdownmenucontent
	 *
	 * @example
	 * ```tsx
	 * <DropdownMenu.Root>
	 *   <DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
	 *   <DropdownMenu.Content width="trigger">
	 *     <DropdownMenu.Item>Edit</DropdownMenu.Item>
	 *     <DropdownMenu.Item>Delete</DropdownMenu.Item>
	 *   </DropdownMenu.Content>
	 * </DropdownMenu.Root>
	 * ```
	 */
	Content,
	/**
	 * A group container for organizing related dropdown menu items.
	 *
	 * @see https://mantle.ngrok.com/components/overlays/dropdown-menu#dropdownmenugroup
	 *
	 * @example
	 * ```tsx
	 * <DropdownMenu.Root>
	 *   <DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
	 *   <DropdownMenu.Content>
	 *     <DropdownMenu.Group>
	 *       <DropdownMenu.Label>Account</DropdownMenu.Label>
	 *       <DropdownMenu.Item>Profile</DropdownMenu.Item>
	 *       <DropdownMenu.Item>Settings</DropdownMenu.Item>
	 *     </DropdownMenu.Group>
	 *   </DropdownMenu.Content>
	 * </DropdownMenu.Root>
	 * ```
	 */
	Group,
	/**
	 * A standard item in the dropdown menu that can be selected or activated.
	 *
	 * @see https://mantle.ngrok.com/components/overlays/dropdown-menu#dropdownmenuitem
	 *
	 * @example
	 * ```tsx
	 * <DropdownMenu.Root>
	 *   <DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
	 *   <DropdownMenu.Content>
	 *     <DropdownMenu.Item onSelect={() => handleEdit()}>
	 *       Edit
	 *     </DropdownMenu.Item>
	 *     <DropdownMenu.Item disabled>
	 *       Delete
	 *     </DropdownMenu.Item>
	 *   </DropdownMenu.Content>
	 * </DropdownMenu.Root>
	 * ```
	 */
	Item,
	/**
	 * A label for grouping and describing sections within the dropdown menu.
	 *
	 * @see https://mantle.ngrok.com/components/overlays/dropdown-menu#dropdownmenulabel
	 *
	 * @example
	 * ```tsx
	 * <DropdownMenu.Root>
	 *   <DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
	 *   <DropdownMenu.Content>
	 *     <DropdownMenu.Label>My Account</DropdownMenu.Label>
	 *     <DropdownMenu.Item>Profile</DropdownMenu.Item>
	 *     <DropdownMenu.Item>Settings</DropdownMenu.Item>
	 *   </DropdownMenu.Content>
	 * </DropdownMenu.Root>
	 * ```
	 */
	Label,
	/**
	 * A radio group container for exclusive selection within the dropdown menu.
	 *
	 * @see https://mantle.ngrok.com/components/overlays/dropdown-menu#dropdownmenuradiogroup
	 *
	 * @example
	 * ```tsx
	 * <DropdownMenu.Root>
	 *   <DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
	 *   <DropdownMenu.Content>
	 *     <DropdownMenu.RadioGroup value={value} onValueChange={setValue}>
	 *       <DropdownMenu.RadioItem value="option1">Option 1</DropdownMenu.RadioItem>
	 *       <DropdownMenu.RadioItem value="option2">Option 2</DropdownMenu.RadioItem>
	 *     </DropdownMenu.RadioGroup>
	 *   </DropdownMenu.Content>
	 * </DropdownMenu.Root>
	 * ```
	 */
	RadioGroup,
	/**
	 * A radio item in the dropdown menu where only one item in the group can be selected.
	 *
	 * @see https://mantle.ngrok.com/components/overlays/dropdown-menu#dropdownmenuradioitem
	 *
	 * @example
	 * ```tsx
	 * <DropdownMenu.Root>
	 *   <DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
	 *   <DropdownMenu.Content>
	 *     <DropdownMenu.RadioGroup value="small" onValueChange={setSize}>
	 *       <DropdownMenu.RadioItem value="small">Small</DropdownMenu.RadioItem>
	 *       <DropdownMenu.RadioItem value="medium">Medium</DropdownMenu.RadioItem>
	 *       <DropdownMenu.RadioItem value="large">Large</DropdownMenu.RadioItem>
	 *     </DropdownMenu.RadioGroup>
	 *   </DropdownMenu.Content>
	 * </DropdownMenu.Root>
	 * ```
	 */
	RadioItem,
	/**
	 * A visual separator for dividing sections within the dropdown menu.
	 *
	 * @see https://mantle.ngrok.com/components/overlays/dropdown-menu#dropdownmenuseparator
	 *
	 * @example
	 * ```tsx
	 * <DropdownMenu.Root>
	 *   <DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
	 *   <DropdownMenu.Content>
	 *     <DropdownMenu.Item>Edit</DropdownMenu.Item>
	 *     <DropdownMenu.Item>Copy</DropdownMenu.Item>
	 *     <DropdownMenu.Separator />
	 *     <DropdownMenu.Item>Delete</DropdownMenu.Item>
	 *   </DropdownMenu.Content>
	 * </DropdownMenu.Root>
	 * ```
	 */
	Separator: DropdownSeparator,
	/**
	 * A keyboard shortcut indicator for dropdown menu items.
	 *
	 * @see https://mantle.ngrok.com/components/overlays/dropdown-menu#dropdownmenushortcut
	 *
	 * @example
	 * ```tsx
	 * <DropdownMenu.Root>
	 *   <DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
	 *   <DropdownMenu.Content>
	 *     <DropdownMenu.Item>
	 *       Save
	 *       <DropdownMenu.Shortcut>⌘S</DropdownMenu.Shortcut>
	 *     </DropdownMenu.Item>
	 *   </DropdownMenu.Content>
	 * </DropdownMenu.Root>
	 * ```
	 */
	Shortcut,
	/**
	 * A submenu container for creating nested dropdown menus.
	 *
	 * @see https://mantle.ngrok.com/components/overlays/dropdown-menu#dropdownmenusub
	 *
	 * @example
	 * ```tsx
	 * <DropdownMenu.Root>
	 *   <DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
	 *   <DropdownMenu.Content>
	 *     <DropdownMenu.Sub>
	 *       <DropdownMenu.SubTrigger>More options</DropdownMenu.SubTrigger>
	 *       <DropdownMenu.SubContent>
	 *         <DropdownMenu.Item>Sub item 1</DropdownMenu.Item>
	 *         <DropdownMenu.Item>Sub item 2</DropdownMenu.Item>
	 *       </DropdownMenu.SubContent>
	 *     </DropdownMenu.Sub>
	 *   </DropdownMenu.Content>
	 * </DropdownMenu.Root>
	 * ```
	 */
	Sub,
	/**
	 * The content container for submenu items.
	 *
	 * `DropdownMenu.SubContent` renders at Tailwind `z-50`, Mantle's shared
	 * floating z-index. When multiple shared layers are open, the most recently
	 * mounted layer renders on top.
	 *
	 * @see https://mantle.ngrok.com/components/overlays/dropdown-menu#dropdownmenusubcontent
	 *
	 * @example
	 * ```tsx
	 * <DropdownMenu.Root>
	 *   <DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
	 *   <DropdownMenu.Content>
	 *     <DropdownMenu.Sub>
	 *       <DropdownMenu.SubTrigger>Export</DropdownMenu.SubTrigger>
	 *       <DropdownMenu.SubContent>
	 *         <DropdownMenu.Item>Export as PDF</DropdownMenu.Item>
	 *         <DropdownMenu.Item>Export as CSV</DropdownMenu.Item>
	 *       </DropdownMenu.SubContent>
	 *     </DropdownMenu.Sub>
	 *   </DropdownMenu.Content>
	 * </DropdownMenu.Root>
	 * ```
	 */
	SubContent,
	/**
	 * The trigger item that opens a submenu when hovered or focused.
	 *
	 * @see https://mantle.ngrok.com/components/overlays/dropdown-menu#dropdownmenusubtrigger
	 *
	 * @example
	 * ```tsx
	 * <DropdownMenu.Root>
	 *   <DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
	 *   <DropdownMenu.Content>
	 *     <DropdownMenu.Sub>
	 *       <DropdownMenu.SubTrigger>Share</DropdownMenu.SubTrigger>
	 *       <DropdownMenu.SubContent>
	 *         <DropdownMenu.Item>Email</DropdownMenu.Item>
	 *         <DropdownMenu.Item>Copy link</DropdownMenu.Item>
	 *       </DropdownMenu.SubContent>
	 *     </DropdownMenu.Sub>
	 *   </DropdownMenu.Content>
	 * </DropdownMenu.Root>
	 * ```
	 */
	SubTrigger,
	/**
	 * The trigger button that opens the dropdown menu.
	 *
	 * @see https://mantle.ngrok.com/components/overlays/dropdown-menu#dropdownmenutrigger
	 *
	 * @example
	 * ```tsx
	 * <DropdownMenu.Root>
	 *   <DropdownMenu.Trigger asChild>
	 *     <Button type="button" appearance="outlined" intent="neutral">
	 *       Open Menu
	 *     </Button>
	 *   </DropdownMenu.Trigger>
	 *   <DropdownMenu.Content>
	 *     <DropdownMenu.Item>Item 1</DropdownMenu.Item>
	 *   </DropdownMenu.Content>
	 * </DropdownMenu.Root>
	 * ```
	 */
	Trigger,
} as const;

export {
	//,
	DropdownMenu,
};
