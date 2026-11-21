"use client";

import { CaretDownIcon } from "@phosphor-icons/react/CaretDown";
import { createContext, useContext, useMemo, type ComponentProps, type ReactNode } from "react";
import { cx } from "../../utils/cx/cx.js";
import type { WithDataSlot } from "../../utils/data-slot.js";
import { joinDataSlot } from "../../utils/data-slot.js";
import { Button } from "../button/button.js";
import { IconButton } from "../button/icon-button.js";
import type { ButtonSize } from "../button/sizes.js";
import * as DropdownMenu from "../dropdown-menu/dropdown-menu-parts.js";
import { Icon } from "../icon/icon.js";

type SplitButtonContextValue = {
	size: ButtonSize;
};

/**
 * `SplitButton.Root` owns the size for the whole composite so the primary
 * action and the menu trigger always render at the same height. The default
 * value (rather than a null-and-throw context) is deliberate: the context
 * carries pure geometry, so a `PrimaryAction` stranded outside `Root`
 * degrades to the standalone `Button` default (`md`) instead of crashing,
 * while `MenuTrigger` already fails fast outside `Root` via Radix's
 * `DropdownMenu.Trigger`.
 */
const SplitButtonContext = createContext<SplitButtonContextValue>({ size: "md" });

type RootProps = ComponentProps<typeof DropdownMenu.Root> &
	ComponentProps<"div"> & {
		/**
		 * The size of the SplitButton, default `"md"`. Applied to both the
		 * primary action and the menu trigger so the two halves always share
		 * one height. The parts do not accept `size`, so mixed-size
		 * composites cannot be expressed in the type system.
		 */
		size?: ButtonSize;
	} & WithDataSlot;

/**
 * A button group that pairs a one-click default action with a dropdown menu
 * of related alternatives. Best for when users typically want one action but
 * occasionally need variants.
 *
 * | Data Attribute | Value                                       | Description                                        |
 * | -------------- | ------------------------------------------- | -------------------------------------------------- |
 * | `data-slot`    | `"split-button"`                            | On the wrapping `<div>`.                           |
 * | `data-size`    | `"xs"` \| `"sm"` \| `"md"` \| `"lg"` \| `"xl"` | The `size` prop, which both halves render at.      |
 *
 * @see https://mantle.ngrok.com/components/actions/split-button#splitbuttonroot
 *
 * @example
 * ```tsx
 * <SplitButton.Root>
 *   <SplitButton.PrimaryAction icon={<CopyIcon />} onClick={copyMarkdownPage}>
 *     Copy page
 *   </SplitButton.PrimaryAction>
 *   <SplitButton.MenuTrigger label="Open doc actions menu" />
 *   <SplitButton.MenuContent>
 *     <SplitButton.MenuItem onClick={copyMarkdownPage}>
 *       Copy page
 *       <Icon svg={<CopyIcon />} />
 *     </SplitButton.MenuItem>
 *     <SplitButton.MenuItem asChild onClick={copyMarkdownPage}>
 *       <a href={markdownUrl} target="_blank" rel="noopener noreferrer">
 *         View as Markdown
 *         <Icon svg={<FileTextIcon />} />
 *       </a>
 *     </SplitButton.MenuItem>
 *   </SplitButton.MenuContent>
 * </SplitButton.Root>
 * ```
 */
const Root = ({
	"data-slot": dataSlot,
	className,
	children,
	dir,
	open,
	defaultOpen,
	onOpenChange,
	modal,
	size = "md",
	ref,
	...props
}: RootProps) => {
	const context: SplitButtonContextValue = useMemo(() => ({ size }), [size]);

	return (
		<DropdownMenu.Root
			dir={dir}
			open={open}
			defaultOpen={defaultOpen}
			onOpenChange={onOpenChange}
			modal={modal}
		>
			<SplitButtonContext.Provider value={context}>
				<div
					data-slot={joinDataSlot(dataSlot, "split-button")}
					data-size={size}
					className={cx(
						"flex flex-row [&>*:first-child]:rounded-r-none [&>*:last-child]:rounded-l-none [&>*:not(:first-child):not(:last-child)]:rounded-none [&>*:not(:first-child)]:-ml-px [&>*:focus]:relative [&>*:focus]:z-10 [&>*:hover]:relative [&>*:hover]:z-10 *:active:scale-100!",
						className,
					)}
					ref={ref}
					{...props}
				>
					{children}
				</div>
			</SplitButtonContext.Provider>
		</DropdownMenu.Root>
	);
};

type PrimaryActionProps = Omit<ComponentProps<typeof Button>, "appearance" | "intent" | "size">;

/**
 * The most common action users can trigger with a single click.
 *
 * @see https://mantle.ngrok.com/components/actions/split-button#splitbuttonprimaryaction
 *
 * @example
 * ```tsx
 * <SplitButton.Root>
 *   <SplitButton.PrimaryAction icon={<CopyIcon />} onClick={copyMarkdownPage}>
 *     Copy page
 *   </SplitButton.PrimaryAction>
 *   <SplitButton.MenuTrigger label="Open doc actions menu" />
 *   <SplitButton.MenuContent>
 *     <SplitButton.MenuItem onClick={copyMarkdownPage}>
 *       Copy page
 *       <Icon svg={<CopyIcon />} />
 *     </SplitButton.MenuItem>
 *     <SplitButton.MenuItem asChild onClick={copyMarkdownPage}>
 *       <a href={markdownUrl} target="_blank" rel="noopener noreferrer">
 *         View as Markdown
 *         <Icon svg={<FileTextIcon />} />
 *       </a>
 *     </SplitButton.MenuItem>
 *   </SplitButton.MenuContent>
 * </SplitButton.Root>
 * ```
 */
const PrimaryAction = ({ "data-slot": dataSlot, ...props }: PrimaryActionProps) => {
	const { size } = useContext(SplitButtonContext);

	// `type` and `ref` flow through; `Button` defaults `type` to "button".
	return (
		<Button
			appearance="outlined"
			intent="neutral"
			size={size}
			data-slot={joinDataSlot(dataSlot, "split-button-primary-action")}
			{...props}
		/>
	);
};

type MenuTriggerProps = Omit<
	ComponentProps<typeof IconButton>,
	"appearance" | "intent" | "size" | "asChild" | "children" | "icon"
> & {
	/**
	 * Not part of the API: the trigger renders its icon alone. Typed `undefined`
	 * so that a props spread with `children` is a type error too.
	 */
	children?: undefined;
	icon?: ReactNode;
};

/**
 * The button that opens the split button dropdown menu.
 *
 * @see https://mantle.ngrok.com/components/actions/split-button#splitbuttonmenutrigger
 *
 * @example
 * ```tsx
 * <SplitButton.Root>
 *   <SplitButton.PrimaryAction icon={<CopyIcon />} onClick={copyMarkdownPage}>
 *     Copy page
 *   </SplitButton.PrimaryAction>
 *   <SplitButton.MenuTrigger label="Open doc actions menu" />
 *   <SplitButton.MenuContent>
 *     <SplitButton.MenuItem onClick={copyMarkdownPage}>
 *       Copy page
 *       <Icon svg={<CopyIcon />} />
 *     </SplitButton.MenuItem>
 *     <SplitButton.MenuItem asChild onClick={copyMarkdownPage}>
 *       <a href={markdownUrl} target="_blank" rel="noopener noreferrer">
 *         View as Markdown
 *         <Icon svg={<FileTextIcon />} />
 *       </a>
 *     </SplitButton.MenuItem>
 *   </SplitButton.MenuContent>
 * </SplitButton.Root>
 * ```
 */
const MenuTrigger = ({ "data-slot": dataSlot, icon, ...props }: MenuTriggerProps) => {
	const { size } = useContext(SplitButtonContext);

	return (
		<DropdownMenu.Trigger
			asChild
			className="group"
			data-slot={joinDataSlot(dataSlot, "split-button-menu-trigger")}
		>
			<IconButton
				icon={
					icon ?? (
						<Icon
							svg={
								<CaretDownIcon
									weight="bold"
									className="size-4 group-data-[state=open]:-rotate-180 transition-transform duration-200 ease-out-strong motion-reduce:transition-none"
								/>
							}
						/>
					)
				}
				appearance="outlined"
				intent="neutral"
				size={size}
				{...props}
			/>
		</DropdownMenu.Trigger>
	);
};

/**
 * The container for the split button dropdown menu content. Appears in a
 * portal with scrolling and animations.
 *
 * @see https://mantle.ngrok.com/components/actions/split-button#splitbuttonmenucontent
 *
 * @example
 * ```tsx
 * <SplitButton.Root>
 *   <SplitButton.PrimaryAction icon={<CopyIcon />} onClick={copyMarkdownPage}>
 *     Copy page
 *   </SplitButton.PrimaryAction>
 *   <SplitButton.MenuTrigger label="Open doc actions menu" />
 *   <SplitButton.MenuContent>
 *     <SplitButton.MenuItem onClick={copyMarkdownPage}>
 *       Copy page
 *       <Icon svg={<CopyIcon />} />
 *     </SplitButton.MenuItem>
 *     <SplitButton.MenuItem asChild onClick={copyMarkdownPage}>
 *       <a href={markdownUrl} target="_blank" rel="noopener noreferrer">
 *         View as Markdown
 *         <Icon svg={<FileTextIcon />} />
 *       </a>
 *     </SplitButton.MenuItem>
 *   </SplitButton.MenuContent>
 * </SplitButton.Root>
 * ```
 */
const MenuContent = ({
	align = "end",
	"data-slot": dataSlot,
	...props
}: ComponentProps<typeof DropdownMenu.Content>) => {
	return (
		<DropdownMenu.Content
			align={align}
			data-slot={joinDataSlot(dataSlot, "split-button-menu-content")}
			{...props}
		/>
	);
};

/**
 * A standard item in the split button dropdown menu that can be selected or
 * activated.
 *
 * @see https://mantle.ngrok.com/components/actions/split-button#splitbuttonmenuitem
 *
 * @example
 * ```tsx
 * <SplitButton.Root>
 *   <SplitButton.PrimaryAction icon={<CopyIcon />} onClick={copyMarkdownPage}>
 *     Copy page
 *   </SplitButton.PrimaryAction>
 *   <SplitButton.MenuTrigger label="Open doc actions menu" />
 *   <SplitButton.MenuContent>
 *     <SplitButton.MenuItem onClick={copyMarkdownPage}>
 *       Copy page
 *       <Icon svg={<CopyIcon />} />
 *     </SplitButton.MenuItem>
 *     <SplitButton.MenuItem asChild onClick={copyMarkdownPage}>
 *       <a href={markdownUrl} target="_blank" rel="noopener noreferrer">
 *         View as Markdown
 *         <Icon svg={<FileTextIcon />} />
 *       </a>
 *     </SplitButton.MenuItem>
 *   </SplitButton.MenuContent>
 * </SplitButton.Root>
 * ```
 */
const MenuItem = ({
	className,
	"data-slot": dataSlot,
	...props
}: ComponentProps<typeof DropdownMenu.Item>) => {
	return (
		<DropdownMenu.Item
			className={cx("gap-2", className)}
			data-slot={joinDataSlot(dataSlot, "split-button-menu-item")}
			{...props}
		/>
	);
};

export {
	//,
	Root,
	PrimaryAction,
	MenuTrigger,
	MenuContent,
	MenuItem,
};
