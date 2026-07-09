import { CaretDownIcon } from "@phosphor-icons/react/CaretDown";
import { forwardRef, type ComponentProps, type ComponentRef, type ReactNode } from "react";
import { cx } from "../../utils/cx/cx.js";
import { Button } from "../button/button.js";
import { IconButton } from "../button/icon-button.js";
import { DropdownMenu } from "../dropdown-menu/dropdown-menu.js";
import { Icon } from "../icon/icon.js";

type RootProps = ComponentProps<typeof DropdownMenu.Root> & ComponentProps<"div">;

const Root = forwardRef<ComponentRef<"div">, RootProps>(
	({ className, children, dir, open, defaultOpen, onOpenChange, modal, ...props }, ref) => {
		return (
			<DropdownMenu.Root
				dir={dir}
				open={open}
				defaultOpen={defaultOpen}
				onOpenChange={onOpenChange}
				modal={modal}
			>
				<div
					data-slot="split-button"
					className={cx(
						"flex flex-row [&>*:first-child]:rounded-r-none [&>*:last-child]:rounded-l-none [&>*:not(:first-child):not(:last-child)]:rounded-none [&>*:not(:first-child)]:-ml-px [&>*:focus]:relative [&>*:focus]:z-10 [&>*:hover]:relative [&>*:hover]:z-10 *:active:scale-100!",
						className,
					)}
					ref={ref}
					{...props}
				>
					{children}
				</div>
			</DropdownMenu.Root>
		);
	},
);
Root.displayName = "SplitButton";

type PrimaryActionProps = Omit<ComponentProps<typeof Button>, "appearance" | "type" | "priority"> &
	Pick<ComponentProps<"button">, "type">;

const PrimaryAction = forwardRef<ComponentRef<"button">, PrimaryActionProps>(
	({ type = "button", ...props }, ref) => {
		return <Button appearance="outlined" priority="neutral" ref={ref} type={type} {...props} />;
	},
);
PrimaryAction.displayName = "SplitButtonPrimaryAction";

type MenuTriggerProps = Omit<
	ComponentProps<typeof IconButton>,
	"appearance" | "size" | "asChild" | "icon"
> &
	Pick<ComponentProps<"button">, "type"> & {
		icon?: ReactNode;
	};

const MenuTrigger = forwardRef<ComponentRef<"button">, MenuTriggerProps>(
	({ icon, type = "button", ...props }, ref) => {
		return (
			<DropdownMenu.Trigger asChild className="group">
				<IconButton
					icon={
						icon ?? (
							<Icon
								svg={
									<CaretDownIcon
										weight="bold"
										className="size-4 group-data-[state=open]:-rotate-180 transition-transform ease-out duration-150"
									/>
								}
							/>
						)
					}
					appearance="outlined"
					ref={ref}
					type={type}
					{...props}
				/>
			</DropdownMenu.Trigger>
		);
	},
);
MenuTrigger.displayName = "SplitButtonMenuTrigger";

const MenuContent = forwardRef<
	ComponentRef<typeof DropdownMenu.Content>,
	ComponentProps<typeof DropdownMenu.Content>
>(({ align = "end", ...props }, ref) => {
	return <DropdownMenu.Content align={align} ref={ref} {...props} />;
});
MenuContent.displayName = "SplitButtonMenuContent";

const MenuItem = forwardRef<
	ComponentRef<typeof DropdownMenu.Item>,
	ComponentProps<typeof DropdownMenu.Item>
>(({ className, ...props }, ref) => {
	return <DropdownMenu.Item className={cx("gap-2", className)} ref={ref} {...props} />;
});
MenuItem.displayName = "SplitButtonMenuItem";

/**
 * A button group which provides a default action with one click while revealing
 * related alternatives through a dropdown menu. Best for when users typically
 * want one action but occasionally need variants.
 *
 * @see https://mantle.ngrok.com/components/split-button#splitbuttonroot
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
 *       <a href={markdownUrl} target="_blank">
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
	 * A button group which provides a default action with one click while revealing
	 * related alternatives through a dropdown menu. Best for when users typically
	 * want one action but occasionally need variants.
	 *
	 * @see https://mantle.ngrok.com/components/split-button#splitbuttonroot
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
	 *       <a href={markdownUrl} target="_blank">
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
	 * @see https://mantle.ngrok.com/components/split-button#splitbuttonprimaryaction
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
	 *       <a href={markdownUrl} target="_blank">
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
	 * @see https://mantle.ngrok.com/components/split-button#splitbuttonmenutrigger
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
	 *       <a href={markdownUrl} target="_blank">
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
	 * @see https://mantle.ngrok.com/components/split-button#splitbuttonmenucontent
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
	 *       <a href={markdownUrl} target="_blank">
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
	 * @see https://mantle.ngrok.com/components/split-button#splitbuttonmenuitem
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
	 *       <a href={markdownUrl} target="_blank">
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
