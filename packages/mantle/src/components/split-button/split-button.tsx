"use client";

import { CaretDownIcon } from "@phosphor-icons/react/CaretDown";
import {
	createContext,
	useContext,
	useMemo,
	useRef,
	type ComponentProps,
	type ReactNode,
	type RefObject,
} from "react";
import { useComposedRefs } from "../../utils/compose-refs/use-composed-refs.js";
import { cx } from "../../utils/cx/cx.js";
import type { WithDataSlot } from "../../utils/data-slot.js";
import { joinDataSlot } from "../../utils/data-slot.js";
import { Button } from "../button/button.js";
import { IconButton } from "../button/icon-button.js";
import type { ButtonSize } from "../button/sizes.js";
import { DropdownMenu } from "../dropdown-menu/dropdown-menu.js";
import { Icon } from "../icon/icon.js";

type SplitButtonContextValue = {
	size: ButtonSize;
	/** The wrapping `<div>` of `Root`, which `MenuContent` measures for `width="root"`. */
	rootRef: RefObject<HTMLDivElement | null>;
};

/**
 * `SplitButton.Root` owns the size for the whole composite so the primary
 * action and the menu trigger always render at the same height. The default
 * value (rather than a null-and-throw context) is deliberate: the context
 * carries pure geometry, so a `PrimaryAction` stranded outside `Root`
 * degrades to the standalone `Button` default (`md`) instead of crashing,
 * and a `MenuContent` with `width="root"` keeps its intrinsic width,
 * while `MenuTrigger` already fails fast outside `Root` via Radix's
 * `DropdownMenu.Trigger`.
 */
const SplitButtonContext = createContext<SplitButtonContextValue>({
	size: "md",
	rootRef: { current: null },
});

/** The private custom property that carries the width of `Root` to `MenuContent`. */
const rootWidthVariable = "--_split-button-root-width";

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
 * `Root` is as wide as its parts, also in a block container. To stretch it,
 * pass a width class such as `w-full`.
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
	const rootRef = useRef<HTMLDivElement>(null);
	const composedRef = useComposedRefs(rootRef, ref);
	const context: SplitButtonContextValue = useMemo(() => ({ size, rootRef }), [size]);

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
						"flex w-fit flex-row [&>*:first-child]:rounded-r-none [&>*:last-child]:rounded-l-none [&>*:not(:first-child):not(:last-child)]:rounded-none [&>*:not(:first-child)]:-ml-px [&>*:focus]:relative [&>*:focus]:z-10 [&>*:hover]:relative [&>*:hover]:z-10 *:active:scale-100!",
						className,
					)}
					ref={composedRef}
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
	"appearance" | "intent" | "size" | "asChild" | "icon"
> & {
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

type MenuContentProps = Omit<ComponentProps<typeof DropdownMenu.Content>, "width"> & {
	/**
	 * The width of the menu. When omitted, the menu takes its intrinsic width.
	 *
	 * @enum
	 * - `"root"`: the width of the whole split button, primary action and menu trigger together. With `align="end"` (the default), the menu lines up with both edges of the split button.
	 * - `"trigger"`: the width of the menu trigger
	 * - `"content"`: the intrinsic width of the menu: the width of the widest item
	 */
	width?: "root" | "trigger" | "content";
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
	className,
	"data-slot": dataSlot,
	ref,
	width,
	...props
}: MenuContentProps) => {
	const { rootRef } = useContext(SplitButtonContext);

	const matchRootWidth = (content: HTMLDivElement | null) => {
		const root = rootRef.current;
		if (width !== "root" || content == null || root == null) {
			return;
		}
		// Why a write before the observer: Radix positions the menu right after
		// it mounts, and `align="end"` must place the final width, not the intrinsic one.
		content.style.setProperty(rootWidthVariable, `${root.getBoundingClientRect().width}px`);
		const observer = new ResizeObserver(([entry]) => {
			const rootWidth = entry?.borderBoxSize[0]?.inlineSize;
			if (rootWidth == null) {
				return;
			}
			content.style.setProperty(rootWidthVariable, `${rootWidth}px`);
		});
		observer.observe(root, { box: "border-box" });
		return () => {
			observer.disconnect();
		};
	};
	const composedRef = useComposedRefs(ref, matchRootWidth);

	return (
		<DropdownMenu.Content
			align={align}
			className={cx(width === "root" && "w-(--_split-button-root-width)", className)}
			data-slot={joinDataSlot(dataSlot, "split-button-menu-content")}
			ref={composedRef}
			width={width === "root" ? undefined : width}
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

/**
 * A button group that pairs a one-click default action with a dropdown menu
 * of related alternatives. Best for when users typically want one action but
 * occasionally need variants.
 *
 * @useWhen Run a default action on one click, and offer related alternatives in an attached menu.
 *
 * @siblings
 * - `Button`: the control runs one action, with no alternatives.
 * - `DropdownMenu`: the button only opens a menu and runs no default action.
 *
 * @see https://mantle.ngrok.com/components/actions/split-button
 *
 * @example
 * Composition:
 * ```
 * SplitButton.Root
 * ├── SplitButton.PrimaryAction
 * ├── SplitButton.MenuTrigger
 * └── SplitButton.MenuContent
 *     └── SplitButton.MenuItem
 * ```
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
 *       <Icon svg={<CopyIcon />} />
 *       Copy page
 *     </SplitButton.MenuItem>
 *     <SplitButton.MenuItem asChild onClick={copyMarkdownPage}>
 *       <a href={markdownUrl} target="_blank" rel="noopener noreferrer">
 *         <Icon svg={<FileTextIcon />} />
 *         View as Markdown
 *       </a>
 *     </SplitButton.MenuItem>
 *   </SplitButton.MenuContent>
 * </SplitButton.Root>
 * ```
 */
const SplitButton = {
	/**
	 * A button group that pairs a one-click default action with a dropdown menu
	 * of related alternatives. Best for when users typically want one action but
	 * occasionally need variants.
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
	Root,
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
	PrimaryAction,
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
	MenuTrigger,
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
	MenuContent,
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
	MenuItem,
} as const;

export { SplitButton };
