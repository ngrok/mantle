import { XIcon } from "@phosphor-icons/react/X";
import { type VariantProps, cva } from "class-variance-authority";
import type { ComponentProps, HTMLAttributes } from "react";
import { cx } from "../../utils/cx/cx.js";
import {
	IconButton,
	type IconButtonAppearance,
	type IconButtonProps,
} from "../button/icon-button.js";
import type { ButtonIntent } from "../button/intents.js";
import * as SheetPrimitive from "../dialog/primitive.js";

/**
 * The root component for a `Sheet`. Should compose the `Sheet.Trigger` and `Sheet.Content`.
 * Acts as a stateful provider for the Sheet's open/closed state.
 *
 * `Sheet` renders its floating layer at Tailwind `z-50`, Mantle's shared
 * floating z-index. When multiple shared layers are open, the most recently
 * mounted layer renders on top.
 *
 * @see https://mantle.ngrok.com/components/overlays/sheet#sheetroot
 *
 * @example
 * ```tsx
 * // Triggering a stateful sheet
 * <Sheet.Root>
 *   <Sheet.Trigger asChild>
 *     <Button type="button" appearance="filled" intent="neutral">
 *       Open Sheet
 *     </Button>
 *   </Sheet.Trigger>
 *   <Sheet.Content>
 *     <Sheet.Header>
 *       <Sheet.TitleGroup>
 *         <Sheet.Title>Are you absolutely sure?</Sheet.Title>
 *         <Sheet.Actions>
 *           <IconButton
 *             appearance="ghost"
 *             intent="neutral"
 *             type="button"
 *             icon={<TrashSimple />}
 *             label="Delete"
 *           />
 *           <Separator orientation="vertical" className="h-[80%]" />
 *           <Sheet.CloseIconButton />
 *         </Sheet.Actions>
 *       </Sheet.TitleGroup>
 *       <Sheet.Description>
 *         This action cannot be undone. This will permanently delete your account and remove your data from our servers.
 *       </Sheet.Description>
 *     </Sheet.Header>
 *     <Sheet.Body>
 *       <p>
 *         Consequat do voluptate culpa fugiat consequat nostrud duis
 *         aliqua minim. Tempor voluptate cillum elit velit. Voluptate
 *         aliqua ipsum aliqua dolore in nisi ea fugiat aliqua velit
 *         proident amet.
 *       </p>
 *     </Sheet.Body>
 *     <Sheet.Footer>
 *       <Sheet.Close asChild>
 *         <Button type="button" appearance="outlined" intent="neutral">Close</Button>
 *       </Sheet.Close>
 *       <Button type="button" appearance="filled" intent="neutral">
 *         Save
 *       </Button>
 *     </Sheet.Footer>
 *   </Sheet.Content>
 * </Sheet.Root>
 * ```
 *
 * @example
 * ```tsx
 * // Sheet without a trigger (e.g. router controlled)
 * <Sheet.Root open onOpenChange={() => onClose()}>
 *   <Sheet.Content>
 *     <Sheet.Header>
 *       <Sheet.TitleGroup>
 *         <Sheet.Title>Are you absolutely sure?</Sheet.Title>
 *         <Sheet.Actions>
 *           <IconButton
 *             appearance="ghost"
 *             intent="neutral"
 *             type="button"
 *             icon={<TrashSimple />}
 *             label="Delete"
 *           />
 *           <Separator orientation="vertical" className="h-[80%]" />
 *           <Sheet.CloseIconButton />
 *         </Sheet.Actions>
 *       </Sheet.TitleGroup>
 *       <Sheet.Description>
 *         This action cannot be undone. This will permanently delete your account and remove your data from our servers.
 *       </Sheet.Description>
 *     </Sheet.Header>
 *     <Sheet.Body>
 *       <p>
 *         Consequat do voluptate culpa fugiat consequat nostrud duis
 *         aliqua minim. Tempor voluptate cillum elit velit. Voluptate
 *         aliqua ipsum aliqua dolore in nisi ea fugiat aliqua velit
 *         proident amet.
 *       </p>
 *     </Sheet.Body>
 *     <Sheet.Footer>
 *       <Sheet.Close asChild>
 *         <Button type="button" appearance="outlined" intent="neutral">Close</Button>
 *       </Sheet.Close>
 *       <Button type="button" appearance="filled" intent="neutral">
 *         Save
 *       </Button>
 *     </Sheet.Footer>
 *   </Sheet.Content>
 * </Sheet.Root>
 * ```
 */
const Root = SheetPrimitive.Root;

/**
 * The button trigger for a `Sheet`. Should be rendered as a child of the `Sheet` component.
 * Renders an unstyled button by default, but can be customized with the `asChild` prop.
 *
 * @see https://mantle.ngrok.com/components/overlays/sheet#sheettrigger
 *
 * @example
 * ```tsx
 * <Sheet.Root>
 *   <Sheet.Trigger asChild>
 *     <Button type="button" appearance="filled" intent="neutral">Open Sheet</Button>
 *   </Sheet.Trigger>
 *   <Sheet.Content>
 *     <Sheet.Header>
 *       <Sheet.TitleGroup>
 *         <Sheet.Title>Are you absolutely sure?</Sheet.Title>
 *         <Sheet.Actions>
 *           <Sheet.CloseIconButton />
 *         </Sheet.Actions>
 *       </Sheet.TitleGroup>
 *       <Sheet.Description>
 *         This action cannot be undone.
 *       </Sheet.Description>
 *     </Sheet.Header>
 *     <Sheet.Body>
 *       <p>Sheet content.</p>
 *     </Sheet.Body>
 *     <Sheet.Footer>
 *       <Sheet.Close asChild>
 *         <Button type="button" appearance="outlined" intent="neutral">Close</Button>
 *       </Sheet.Close>
 *       <Button type="button" appearance="filled" intent="neutral">Save</Button>
 *     </Sheet.Footer>
 *   </Sheet.Content>
 * </Sheet.Root>
 * ```
 */
const Trigger = SheetPrimitive.Trigger;

/**
 * The close button for a `Sheet`. Should be rendered as a child of the `Sheet.Content` component.
 * Usually contained within the `Sheet.Footer` component.
 * Renders an unstyled button by default, but can be customized with the `asChild` prop.
 *
 * @see https://mantle.ngrok.com/components/overlays/sheet#sheetclose
 *
 * @example
 * ```tsx
 * <Sheet.Root>
 *   <Sheet.Trigger asChild>
 *     <Button type="button" appearance="filled" intent="neutral">Open Sheet</Button>
 *   </Sheet.Trigger>
 *   <Sheet.Content>
 *     <Sheet.Header>
 *       <Sheet.TitleGroup>
 *         <Sheet.Title>Are you absolutely sure?</Sheet.Title>
 *         <Sheet.Actions>
 *           <Sheet.CloseIconButton />
 *         </Sheet.Actions>
 *       </Sheet.TitleGroup>
 *       <Sheet.Description>
 *         This action cannot be undone.
 *       </Sheet.Description>
 *     </Sheet.Header>
 *     <Sheet.Body>
 *       <p>Sheet content.</p>
 *     </Sheet.Body>
 *     <Sheet.Footer>
 *       <Sheet.Close asChild>
 *         <Button type="button" appearance="outlined" intent="neutral">Close</Button>
 *       </Sheet.Close>
 *       <Button type="button" appearance="filled" intent="neutral">Save</Button>
 *     </Sheet.Footer>
 *   </Sheet.Content>
 * </Sheet.Root>
 * ```
 */
const Close = SheetPrimitive.Close;

/**
 * The portal for a sheet. Should be rendered as a child of the `Sheet` component.
 * Renders a portal that the `SheetOverlay` and `Sheet.Content` is rendered into.
 *
 * @private
 */
const SheetPortal = SheetPrimitive.Portal;

/**
 * The overlay backdrop for a sheet. Should be rendered as a child of the `SheetPortal` component.
 *
 * You likely don't need to use this component directly, as it is used internally by the `Sheet.Content` component.
 *
 * @private
 */
const SheetOverlay = ({
	className,
	ref,
	...props
}: ComponentProps<typeof SheetPrimitive.Overlay>) => (
	<SheetPrimitive.Overlay
		data-slot="sheet-overlay"
		className={cx(
			"bg-overlay data-state-closed:animate-out data-state-closed:fade-out-0 data-state-open:animate-in data-state-open:fade-in-0 fixed inset-0 z-50 backdrop-blur-xs",
			className,
		)}
		{...props}
		ref={ref}
	/>
);

const SheetVariants = cva(
	"bg-dialog border-dialog inset-y-0 h-full w-full fixed z-50 flex flex-col shadow-lg outline-hidden transition ease-in-out focus-within:outline-hidden data-state-closed:duration-100 data-state-closed:animate-out data-state-open:duration-100 data-state-open:animate-in",
	{
		variants: {
			/**
			 * The side of the screen the sheet should slide in from.
			 */
			side: {
				left: "data-state-closed:slide-out-to-left data-state-open:slide-in-from-left left-0 border-r",
				right:
					"data-state-closed:slide-out-to-right data-state-open:slide-in-from-right right-0 border-l",
			},
		},
		defaultVariants: {
			side: "right",
		},
	},
);

type SheetContentProps = ComponentProps<typeof SheetPrimitive.Content> &
	VariantProps<typeof SheetVariants> & {
		/**
		 * The preferred width of the `Sheet.Content` as a tailwind `max-w-` class.
		 *
		 * By default, a `Sheet`'s content width is responsive with a default
		 * preferred width: the maximum width of the `Sheet.Content` when the window
		 * viewport is larger than the mobile breakpoint (`sm`).
		 *
		 * @default `sm:max-w-[30rem]`
		 */
		preferredWidth?: `sm:max-w-${string}`;
	};

/**
 * The main container for a `Sheet`. Should be rendered as a child of the `Sheet` component.
 * Renders on top of the overlay backdrop.
 * Should contain the `Sheet.Header`, `Sheet.Body`, and `Sheet.Footer`.
 *
 * `Sheet.Content` renders its floating layer at Tailwind `z-50`, Mantle's
 * shared floating z-index. When multiple shared layers are open, the most
 * recently mounted layer renders on top.
 *
 * @see https://mantle.ngrok.com/components/overlays/sheet#sheetcontent
 *
 * @example
 * ```tsx
 * // Sheet without a trigger (e.g. router controlled)
 * <Sheet.Root open onOpenChange={() => onClose()}>
 *   <Sheet.Content>
 *     <Sheet.Header>
 *       <Sheet.TitleGroup>
 *         <Sheet.Title>Are you absolutely sure?</Sheet.Title>
 *         <Sheet.Actions>
 *           <IconButton
 *             appearance="ghost"
 *             intent="neutral"
 *             type="button"
 *             icon={<TrashSimple />}
 *             label="Delete"
 *           />
 *           <Separator orientation="vertical" className="h-[80%]" />
 *           <Sheet.CloseIconButton />
 *         </Sheet.Actions>
 *       </Sheet.TitleGroup>
 *       <Sheet.Description>
 *         This action cannot be undone. This will permanently delete your account and remove your data from our servers.
 *       </Sheet.Description>
 *     </Sheet.Header>
 *     <Sheet.Body>
 *       <p>
 *         Consequat do voluptate culpa fugiat consequat nostrud duis
 *         aliqua minim. Tempor voluptate cillum elit velit. Voluptate
 *         aliqua ipsum aliqua dolore in nisi ea fugiat aliqua velit
 *         proident amet.
 *       </p>
 *     </Sheet.Body>
 *     <Sheet.Footer>
 *       <Sheet.Close asChild>
 *         <Button type="button" appearance="outlined" intent="neutral">Close</Button>
 *       </Sheet.Close>
 *       <Button type="button" appearance="filled" intent="neutral">
 *         Save
 *       </Button>
 *     </Sheet.Footer>
 *   </Sheet.Content>
 * </Sheet.Root>
 * ```
 */
const Content = ({
	children,
	className,
	preferredWidth = "sm:max-w-[30rem]",
	side = "right",
	ref,
	...props
}: SheetContentProps) => (
	<SheetPortal>
		<SheetOverlay />
		<SheetPrimitive.Content
			data-slot="sheet-content"
			data-mantle-modal-content
			className={cx(SheetVariants({ side }), preferredWidth, className)}
			ref={ref}
			{...props}
		>
			{children}
		</SheetPrimitive.Content>
	</SheetPortal>
);

type SheetCloseIconButtonProps = Partial<
	Omit<IconButtonProps, "icon" | "appearance" | "intent">
> & {
	/**
	 * The visual style of the close icon button. Optional here —
	 * `Sheet.CloseIconButton` defaults to `"ghost"` so it stays visually quiet
	 * in the `Sheet.Header` beside the title.
	 *
	 * @default "ghost"
	 */
	appearance?: IconButtonAppearance;
	/**
	 * The tone of the close icon button. Optional here — `Sheet.CloseIconButton`
	 * defaults to `"neutral"`, the workhorse tone for routine dismissal.
	 *
	 * @default "neutral"
	 */
	intent?: ButtonIntent;
};

/**
 * An icon button that closes the `Sheet` when clicked.
 * Should be rendered within the `Sheet.Header` as a child of `Sheet.Actions`.
 *
 * Composes around the mantle `IconButton` and defaults to
 * `appearance="ghost"` and `intent="neutral"`.
 *
 * @see https://mantle.ngrok.com/components/overlays/sheet#sheetcloseiconbutton
 *
 * @example
 * ```tsx
 * // Sheet without a trigger (e.g. router controlled)
 * <Sheet.Root open onOpenChange={() => onClose()}>
 *   <Sheet.Content>
 *     <Sheet.Header>
 *       <Sheet.TitleGroup>
 *         <Sheet.Title>Are you absolutely sure?</Sheet.Title>
 *         <Sheet.Actions>
 *           <IconButton
 *             appearance="ghost"
 *             intent="neutral"
 *             type="button"
 *             icon={<TrashSimple />}
 *             label="Delete"
 *           />
 *           <Separator orientation="vertical" className="h-[80%]" />
 *           <Sheet.CloseIconButton />
 *         </Sheet.Actions>
 *       </Sheet.TitleGroup>
 *       <Sheet.Description>
 *         This action cannot be undone. This will permanently delete your account and remove your data from our servers.
 *       </Sheet.Description>
 *     </Sheet.Header>
 *     <Sheet.Body>
 *       <p>
 *         Consequat do voluptate culpa fugiat consequat nostrud duis
 *         aliqua minim. Tempor voluptate cillum elit velit. Voluptate
 *         aliqua ipsum aliqua dolore in nisi ea fugiat aliqua velit
 *         proident amet.
 *       </p>
 *     </Sheet.Body>
 *     <Sheet.Footer>
 *       <Sheet.Close asChild>
 *         <Button type="button" appearance="outlined" intent="neutral">Close</Button>
 *       </Sheet.Close>
 *       <Button type="button" appearance="filled" intent="neutral">
 *         Save
 *       </Button>
 *     </Sheet.Footer>
 *   </Sheet.Content>
 * </Sheet.Root>
 * ```
 */
const CloseIconButton = ({
	size = "md",
	type = "button",
	label = "Close Sheet",
	appearance = "ghost",
	intent = "neutral",
	...props
}: SheetCloseIconButtonProps) => (
	<SheetPrimitive.Close asChild>
		<IconButton
			data-slot="sheet-close-icon-button"
			appearance={appearance}
			icon={<XIcon />}
			intent={intent}
			label={label}
			size={size}
			type={type}
			{...props}
		/>
	</SheetPrimitive.Close>
);

/**
 * The body container for a `Sheet`. This is where you would typically place the main content of the sheet, such as forms or text.
 * Should be rendered as a child of `Sheet.Content`.
 *
 * @see https://mantle.ngrok.com/components/overlays/sheet#sheetbody
 *
 * @example
 * ```tsx
 * // Sheet without a trigger (e.g. router controlled)
 * <Sheet.Root open onOpenChange={() => onClose()}>
 *   <Sheet.Content>
 *     <Sheet.Header>
 *       <Sheet.TitleGroup>
 *         <Sheet.Title>Are you absolutely sure?</Sheet.Title>
 *         <Sheet.Actions>
 *           <IconButton
 *             appearance="ghost"
 *             intent="neutral"
 *             type="button"
 *             icon={<TrashSimple />}
 *             label="Delete"
 *           />
 *           <Separator orientation="vertical" className="h-[80%]" />
 *           <Sheet.CloseIconButton />
 *         </Sheet.Actions>
 *       </Sheet.TitleGroup>
 *       <Sheet.Description>
 *         This action cannot be undone. This will permanently delete your account and remove your data from our servers.
 *       </Sheet.Description>
 *     </Sheet.Header>
 *     <Sheet.Body>
 *       <p>
 *         Consequat do voluptate culpa fugiat consequat nostrud duis
 *         aliqua minim. Tempor voluptate cillum elit velit. Voluptate
 *         aliqua ipsum aliqua dolore in nisi ea fugiat aliqua velit
 *         proident amet.
 *       </p>
 *     </Sheet.Body>
 *     <Sheet.Footer>
 *       <Sheet.Close asChild>
 *         <Button type="button" appearance="outlined" intent="neutral">Close</Button>
 *       </Sheet.Close>
 *       <Button type="button" appearance="filled" intent="neutral">
 *         Save
 *       </Button>
 *     </Sheet.Footer>
 *   </Sheet.Content>
 * </Sheet.Root>
 * ```
 */
const Body = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
	<div
		data-slot="sheet-body"
		className={cx(
			"scrollbar scrollbar-gutter-stable text-body flex-1 overflow-y-auto p-6",
			className,
		)}
		{...props}
	/>
);

/**
 * The header container for a `Sheet`. This is where you would typically place the title, description, and actions.
 * Should be rendered as a child of `Sheet.Content`.
 *
 * @see https://mantle.ngrok.com/components/overlays/sheet#sheetheader
 *
 * @example
 * ```tsx
 * // Sheet without a trigger (e.g. router controlled)
 * <Sheet.Root open onOpenChange={() => onClose()}>
 *   <Sheet.Content>
 *     <Sheet.Header>
 *       <Sheet.TitleGroup>
 *         <Sheet.Title>Are you absolutely sure?</Sheet.Title>
 *         <Sheet.Actions>
 *           <IconButton
 *             appearance="ghost"
 *             intent="neutral"
 *             type="button"
 *             icon={<TrashSimple />}
 *             label="Delete"
 *           />
 *           <Separator orientation="vertical" className="h-[80%]" />
 *           <Sheet.CloseIconButton />
 *         </Sheet.Actions>
 *       </Sheet.TitleGroup>
 *       <Sheet.Description>
 *         This action cannot be undone. This will permanently delete your account and remove your data from our servers.
 *       </Sheet.Description>
 *     </Sheet.Header>
 *     <Sheet.Body>
 *       <p>
 *         Consequat do voluptate culpa fugiat consequat nostrud duis
 *         aliqua minim. Tempor voluptate cillum elit velit. Voluptate
 *         aliqua ipsum aliqua dolore in nisi ea fugiat aliqua velit
 *         proident amet.
 *       </p>
 *     </Sheet.Body>
 *     <Sheet.Footer>
 *       <Sheet.Close asChild>
 *         <Button type="button" appearance="outlined" intent="neutral">Close</Button>
 *       </Sheet.Close>
 *       <Button type="button" appearance="filled" intent="neutral">
 *         Save
 *       </Button>
 *     </Sheet.Footer>
 *   </Sheet.Content>
 * </Sheet.Root>
 * ```
 */
const Header = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
	<div
		data-slot="sheet-header"
		className={cx(
			"border-dialog-muted flex shrink-0 flex-col gap-2 border-b py-4 pl-6 pr-4",
			"has-[.icon-button]:pr-4", // when there are actions in the header, shorten the padding
			className,
		)}
		{...props}
	/>
);

/**
 * The footer container for a `Sheet`. This is where you would typically place close and submit buttons.
 * Should be rendered as a child of `Sheet.Content`.
 *
 * @see https://mantle.ngrok.com/components/overlays/sheet#sheetfooter
 *
 * @example
 * ```tsx
 * // Sheet without a trigger (e.g. router controlled)
 * <Sheet.Root open onOpenChange={() => onClose()}>
 *   <Sheet.Content>
 *     <Sheet.Header>
 *       <Sheet.TitleGroup>
 *         <Sheet.Title>Are you absolutely sure?</Sheet.Title>
 *         <Sheet.Actions>
 *           <IconButton
 *             appearance="ghost"
 *             intent="neutral"
 *             type="button"
 *             icon={<TrashSimple />}
 *             label="Delete"
 *           />
 *           <Separator orientation="vertical" className="h-[80%]" />
 *           <Sheet.CloseIconButton />
 *         </Sheet.Actions>
 *       </Sheet.TitleGroup>
 *       <Sheet.Description>
 *         This action cannot be undone. This will permanently delete your account and remove your data from our servers.
 *       </Sheet.Description>
 *     </Sheet.Header>
 *     <Sheet.Body>
 *       <p>
 *         Consequat do voluptate culpa fugiat consequat nostrud duis
 *         aliqua minim. Tempor voluptate cillum elit velit. Voluptate
 *         aliqua ipsum aliqua dolore in nisi ea fugiat aliqua velit
 *         proident amet.
 *       </p>
 *     </Sheet.Body>
 *     <Sheet.Footer>
 *       <Sheet.Close asChild>
 *         <Button type="button" appearance="outlined" intent="neutral">Close</Button>
 *       </Sheet.Close>
 *       <Button type="button" appearance="filled" intent="neutral">
 *         Save
 *       </Button>
 *     </Sheet.Footer>
 *   </Sheet.Content>
 * </Sheet.Root>
 * ```
 */
const Footer = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
	<div
		data-slot="sheet-footer"
		className={cx(
			"border-dialog-muted flex shrink-0 justify-end gap-2 border-t px-6 py-2.5",
			className,
		)}
		{...props}
	/>
);

/**
 * The title for a `Sheet`. Typically rendered as a child of `Sheet.TitleGroup`.
 * Defaults to an `h2` element, but can be changed via the `asChild` prop.
 *
 * @see https://mantle.ngrok.com/components/overlays/sheet#sheettitle
 *
 * @example
 * ```tsx
 * // Sheet without a trigger (e.g. router controlled)
 * <Sheet.Root open onOpenChange={() => onClose()}>
 *   <Sheet.Content>
 *     <Sheet.Header>
 *       <Sheet.TitleGroup>
 *         <Sheet.Title>Are you absolutely sure?</Sheet.Title>
 *         <Sheet.Actions>
 *           <IconButton
 *             appearance="ghost"
 *             intent="neutral"
 *             type="button"
 *             icon={<TrashSimple />}
 *             label="Delete"
 *           />
 *           <Separator orientation="vertical" className="h-[80%]" />
 *           <Sheet.CloseIconButton />
 *         </Sheet.Actions>
 *       </Sheet.TitleGroup>
 *       <Sheet.Description>
 *         This action cannot be undone. This will permanently delete your account and remove your data from our servers.
 *       </Sheet.Description>
 *     </Sheet.Header>
 *     <Sheet.Body>
 *       <p>
 *         Consequat do voluptate culpa fugiat consequat nostrud duis
 *         aliqua minim. Tempor voluptate cillum elit velit. Voluptate
 *         aliqua ipsum aliqua dolore in nisi ea fugiat aliqua velit
 *         proident amet.
 *       </p>
 *     </Sheet.Body>
 *     <Sheet.Footer>
 *       <Sheet.Close asChild>
 *         <Button type="button" appearance="outlined" intent="neutral">Close</Button>
 *       </Sheet.Close>
 *       <Button type="button" appearance="filled" intent="neutral">
 *         Save
 *       </Button>
 *     </Sheet.Footer>
 *   </Sheet.Content>
 * </Sheet.Root>
 * ```
 */
const Title = ({ className, ref, ...props }: ComponentProps<typeof SheetPrimitive.Title>) => (
	<SheetPrimitive.Title
		data-slot="sheet-title"
		ref={ref}
		className={cx("text-strong flex-1 truncate text-lg font-medium", className)}
		{...props}
	/>
);

/**
 * A group container for the title and actions of a sheet. Typically rendered as a child of `Sheet.Header`.
 *
 * @see https://mantle.ngrok.com/components/overlays/sheet#sheettitlegroup
 *
 * @example
 * ```tsx
 * // Sheet without a trigger (e.g. router controlled)
 * <Sheet.Root open onOpenChange={() => onClose()}>
 *   <Sheet.Content>
 *     <Sheet.Header>
 *       <Sheet.TitleGroup>
 *         <Sheet.Title>Are you absolutely sure?</Sheet.Title>
 *         <Sheet.Actions>
 *           <IconButton
 *             appearance="ghost"
 *             intent="neutral"
 *             type="button"
 *             icon={<TrashSimple />}
 *             label="Delete"
 *           />
 *           <Separator orientation="vertical" className="h-[80%]" />
 *           <Sheet.CloseIconButton />
 *         </Sheet.Actions>
 *       </Sheet.TitleGroup>
 *       <Sheet.Description>
 *         This action cannot be undone. This will permanently delete your account and remove your data from our servers.
 *       </Sheet.Description>
 *     </Sheet.Header>
 *     <Sheet.Body>
 *       <p>
 *         Consequat do voluptate culpa fugiat consequat nostrud duis
 *         aliqua minim. Tempor voluptate cillum elit velit. Voluptate
 *         aliqua ipsum aliqua dolore in nisi ea fugiat aliqua velit
 *         proident amet.
 *       </p>
 *     </Sheet.Body>
 *     <Sheet.Footer>
 *       <Sheet.Close asChild>
 *         <Button type="button" appearance="outlined" intent="neutral">Close</Button>
 *       </Sheet.Close>
 *       <Button type="button" appearance="filled" intent="neutral">
 *         Save
 *       </Button>
 *     </Sheet.Footer>
 *   </Sheet.Content>
 * </Sheet.Root>
 * ```
 */
const TitleGroup = ({ children, className, ref, ...props }: ComponentProps<"div">) => (
	<div
		data-slot="sheet-title-group"
		className={cx("flex items-center justify-between gap-2", className)}
		{...props}
		ref={ref}
	>
		{children}
	</div>
);

/**
 * A description for a sheet. Typically rendered as a child of `Sheet.Header`.
 *
 * @see https://mantle.ngrok.com/components/overlays/sheet#sheetdescription
 *
 * @example
 * ```tsx
 * // Sheet without a trigger (e.g. router controlled)
 * <Sheet.Root open onOpenChange={() => onClose()}>
 *   <Sheet.Content>
 *     <Sheet.Header>
 *       <Sheet.TitleGroup>
 *         <Sheet.Title>Are you absolutely sure?</Sheet.Title>
 *         <Sheet.Actions>
 *           <IconButton
 *             appearance="ghost"
 *             intent="neutral"
 *             type="button"
 *             icon={<TrashSimple />}
 *             label="Delete"
 *           />
 *           <Separator orientation="vertical" className="h-[80%]" />
 *           <Sheet.CloseIconButton />
 *         </Sheet.Actions>
 *       </Sheet.TitleGroup>
 *       <Sheet.Description>
 *         This action cannot be undone. This will permanently delete your account and remove your data from our servers.
 *       </Sheet.Description>
 *     </Sheet.Header>
 *     <Sheet.Body>
 *       <p>
 *         Consequat do voluptate culpa fugiat consequat nostrud duis
 *         aliqua minim. Tempor voluptate cillum elit velit. Voluptate
 *         aliqua ipsum aliqua dolore in nisi ea fugiat aliqua velit
 *         proident amet.
 *       </p>
 *     </Sheet.Body>
 *     <Sheet.Footer>
 *       <Sheet.Close asChild>
 *         <Button type="button" appearance="outlined" intent="neutral">Close</Button>
 *       </Sheet.Close>
 *       <Button type="button" appearance="filled" intent="neutral">
 *         Save
 *       </Button>
 *     </Sheet.Footer>
 *   </Sheet.Content>
 * </Sheet.Root>
 * ```
 */
const Description = ({
	className,
	ref,
	...props
}: ComponentProps<typeof SheetPrimitive.Description>) => (
	<SheetPrimitive.Description
		data-slot="sheet-description"
		ref={ref}
		className={cx("text-body text-sm", className)}
		{...props}
	/>
);

/**
 * A group container for the actions of a `Sheet`. Typically rendered as a child of `Sheet.TitleGroup`.
 *
 * @see https://mantle.ngrok.com/components/overlays/sheet#sheetactions
 *
 * @example
 * ```tsx
 * // Sheet without a trigger (e.g. router controlled)
 * <Sheet.Root open onOpenChange={() => onClose()}>
 *   <Sheet.Content>
 *     <Sheet.Header>
 *       <Sheet.TitleGroup>
 *         <Sheet.Title>Are you absolutely sure?</Sheet.Title>
 *         <Sheet.Actions>
 *           <IconButton
 *             appearance="ghost"
 *             intent="neutral"
 *             type="button"
 *             icon={<TrashSimple />}
 *             label="Delete"
 *           />
 *           <Separator orientation="vertical" className="h-[80%]" />
 *           <Sheet.CloseIconButton />
 *         </Sheet.Actions>
 *       </Sheet.TitleGroup>
 *       <Sheet.Description>
 *         This action cannot be undone. This will permanently delete your account and remove your data from our servers.
 *       </Sheet.Description>
 *     </Sheet.Header>
 *     <Sheet.Body>
 *       <p>
 *         Consequat do voluptate culpa fugiat consequat nostrud duis
 *         aliqua minim. Tempor voluptate cillum elit velit. Voluptate
 *         aliqua ipsum aliqua dolore in nisi ea fugiat aliqua velit
 *         proident amet.
 *       </p>
 *     </Sheet.Body>
 *     <Sheet.Footer>
 *       <Sheet.Close asChild>
 *         <Button type="button" appearance="outlined" intent="neutral">Close</Button>
 *       </Sheet.Close>
 *       <Button type="button" appearance="filled" intent="neutral">
 *         Save
 *       </Button>
 *     </Sheet.Footer>
 *   </Sheet.Content>
 * </Sheet.Root>
 * ```
 */
const Actions = ({ children, className, ref, ...props }: ComponentProps<"div">) => (
	<div
		data-slot="sheet-actions"
		className={cx("flex h-full items-center gap-2", className)}
		{...props}
		ref={ref}
	>
		{children}
	</div>
);

/**
 * A container that overlays the current view from the edge of the screen.
 * It is a lightweight way of allowing users to complete a task without losing
 * contextual information of the view beneath it. Use Sheet for side-panel
 * content that slides in from any edge — filter panels, detail/inspector
 * views, navigation drawers, mobile menus. For a centered modal that
 * interrupts the user, use `Dialog` (or `AlertDialog` for destructive
 * confirmations).
 *
 * `Sheet` renders its floating layer at Tailwind `z-50`, Mantle's shared
 * floating z-index. When multiple shared layers are open, the most recently
 * mounted layer renders on top.
 *
 * @see https://mantle.ngrok.com/components/overlays/sheet
 *
 * @example
 * Composition:
 * ```
 * Sheet.Root
 * ├── Sheet.Trigger
 * └── Sheet.Content
 *     ├── Sheet.Header
 *     │   ├── Sheet.TitleGroup
 *     │   │   ├── Sheet.Title
 *     │   │   └── Sheet.Actions
 *     │   └── Sheet.Description
 *     ├── Sheet.Body
 *     └── Sheet.Footer
 *         └── Sheet.Close
 * ```
 *
 * @example
 * ```tsx
 * // Triggering a stateful sheet
 * <Sheet.Root>
 *   <Sheet.Trigger asChild>
 *     <Button type="button" appearance="filled" intent="neutral">
 *       Open Sheet
 *     </Button>
 *   </Sheet.Trigger>
 *   <Sheet.Content>
 *     <Sheet.Header>
 *       <Sheet.TitleGroup>
 *         <Sheet.Title>Are you absolutely sure?</Sheet.Title>
 *         <Sheet.Actions>
 *           <IconButton
 *             appearance="ghost"
 *             intent="neutral"
 *             type="button"
 *             icon={<TrashSimple />}
 *             label="Delete"
 *           />
 *           <Separator orientation="vertical" className="h-[80%]" />
 *           <Sheet.CloseIconButton />
 *         </Sheet.Actions>
 *       </Sheet.TitleGroup>
 *       <Sheet.Description>
 *         This action cannot be undone. This will permanently delete your account and remove your data from our servers.
 *       </Sheet.Description>
 *     </Sheet.Header>
 *     <Sheet.Body>
 *       <p>
 *         Consequat do voluptate culpa fugiat consequat nostrud duis
 *         aliqua minim. Tempor voluptate cillum elit velit. Voluptate
 *         aliqua ipsum aliqua dolore in nisi ea fugiat aliqua velit
 *         proident amet.
 *       </p>
 *     </Sheet.Body>
 *     <Sheet.Footer>
 *       <Sheet.Close asChild>
 *         <Button type="button" appearance="outlined" intent="neutral">Close</Button>
 *       </Sheet.Close>
 *       <Button type="button" appearance="filled" intent="neutral">
 *         Save
 *       </Button>
 *     </Sheet.Footer>
 *   </Sheet.Content>
 * </Sheet.Root>
 * ```
 *
 * @example
 * ```tsx
 * // Sheet without a trigger (e.g. router controlled)
 * <Sheet.Root open onOpenChange={() => onClose()}>
 *   <Sheet.Content>
 *     <Sheet.Header>
 *       <Sheet.TitleGroup>
 *         <Sheet.Title>Are you absolutely sure?</Sheet.Title>
 *         <Sheet.Actions>
 *           <IconButton
 *             appearance="ghost"
 *             intent="neutral"
 *             type="button"
 *             icon={<TrashSimple />}
 *             label="Delete"
 *           />
 *           <Separator orientation="vertical" className="h-[80%]" />
 *           <Sheet.CloseIconButton />
 *         </Sheet.Actions>
 *       </Sheet.TitleGroup>
 *       <Sheet.Description>
 *         This action cannot be undone. This will permanently delete your account and remove your data from our servers.
 *       </Sheet.Description>
 *     </Sheet.Header>
 *     <Sheet.Body>
 *       <p>
 *         Consequat do voluptate culpa fugiat consequat nostrud duis
 *         aliqua minim. Tempor voluptate cillum elit velit. Voluptate
 *         aliqua ipsum aliqua dolore in nisi ea fugiat aliqua velit
 *         proident amet.
 *       </p>
 *     </Sheet.Body>
 *     <Sheet.Footer>
 *       <Sheet.Close asChild>
 *         <Button type="button" appearance="outlined" intent="neutral">Close</Button>
 *       </Sheet.Close>
 *       <Button type="button" appearance="filled" intent="neutral">
 *         Save
 *       </Button>
 *     </Sheet.Footer>
 *   </Sheet.Content>
 * </Sheet.Root>
 * ```
 */
const Sheet = {
	/**
	 * The root component for a `Sheet`. Should compose the `Sheet.Trigger` and `Sheet.Content`.
	 * Acts as a stateful provider for the Sheet's open/closed state.
	 *
	 * `Sheet` renders its floating layer at Tailwind `z-50`, Mantle's shared
	 * floating z-index. When multiple shared layers are open, the most recently
	 * mounted layer renders on top.
	 *
	 * @see https://mantle.ngrok.com/components/overlays/sheet#sheetroot
	 *
	 * @example
	 * ```tsx
	 * <Sheet.Root>
	 *   <Sheet.Trigger asChild>
	 *     <Button type="button" appearance="filled" intent="neutral">Open Sheet</Button>
	 *   </Sheet.Trigger>
	 *   <Sheet.Content>
	 *     <Sheet.Header>
	 *       <Sheet.TitleGroup>
	 *         <Sheet.Title>Are you absolutely sure?</Sheet.Title>
	 *         <Sheet.Actions>
	 *           <Sheet.CloseIconButton />
	 *         </Sheet.Actions>
	 *       </Sheet.TitleGroup>
	 *       <Sheet.Description>
	 *         This action cannot be undone.
	 *       </Sheet.Description>
	 *     </Sheet.Header>
	 *     <Sheet.Body>
	 *       <p>Sheet content.</p>
	 *     </Sheet.Body>
	 *     <Sheet.Footer>
	 *       <Sheet.Close asChild>
	 *         <Button type="button" appearance="outlined" intent="neutral">Close</Button>
	 *       </Sheet.Close>
	 *       <Button type="button" appearance="filled" intent="neutral">Save</Button>
	 *     </Sheet.Footer>
	 *   </Sheet.Content>
	 * </Sheet.Root>
	 * ```
	 */
	Root,
	/**
	 * A group container for the actions of a `Sheet`. Typically rendered as a child of `Sheet.TitleGroup`.
	 *
	 * @see https://mantle.ngrok.com/components/overlays/sheet#sheetactions
	 *
	 * @example
	 * ```tsx
	 * <Sheet.Root>
	 *   <Sheet.Trigger asChild>
	 *     <Button type="button" appearance="filled" intent="neutral">Open Sheet</Button>
	 *   </Sheet.Trigger>
	 *   <Sheet.Content>
	 *     <Sheet.Header>
	 *       <Sheet.TitleGroup>
	 *         <Sheet.Title>Are you absolutely sure?</Sheet.Title>
	 *         <Sheet.Actions>
	 *           <Sheet.CloseIconButton />
	 *         </Sheet.Actions>
	 *       </Sheet.TitleGroup>
	 *       <Sheet.Description>
	 *         This action cannot be undone.
	 *       </Sheet.Description>
	 *     </Sheet.Header>
	 *     <Sheet.Body>
	 *       <p>Sheet content.</p>
	 *     </Sheet.Body>
	 *     <Sheet.Footer>
	 *       <Sheet.Close asChild>
	 *         <Button type="button" appearance="outlined" intent="neutral">Close</Button>
	 *       </Sheet.Close>
	 *       <Button type="button" appearance="filled" intent="neutral">Save</Button>
	 *     </Sheet.Footer>
	 *   </Sheet.Content>
	 * </Sheet.Root>
	 * ```
	 */
	Actions,
	/**
	 * The body container for a `Sheet`. This is where you would typically place the main content of the sheet, such as forms or text.
	 * Should be rendered as a child of `Sheet.Content`.
	 *
	 * @see https://mantle.ngrok.com/components/overlays/sheet#sheetbody
	 *
	 * @example
	 * ```tsx
	 * <Sheet.Root>
	 *   <Sheet.Trigger asChild>
	 *     <Button type="button" appearance="filled" intent="neutral">Open Sheet</Button>
	 *   </Sheet.Trigger>
	 *   <Sheet.Content>
	 *     <Sheet.Header>
	 *       <Sheet.TitleGroup>
	 *         <Sheet.Title>Are you absolutely sure?</Sheet.Title>
	 *         <Sheet.Actions>
	 *           <Sheet.CloseIconButton />
	 *         </Sheet.Actions>
	 *       </Sheet.TitleGroup>
	 *       <Sheet.Description>
	 *         This action cannot be undone.
	 *       </Sheet.Description>
	 *     </Sheet.Header>
	 *     <Sheet.Body>
	 *       <p>Sheet content.</p>
	 *     </Sheet.Body>
	 *     <Sheet.Footer>
	 *       <Sheet.Close asChild>
	 *         <Button type="button" appearance="outlined" intent="neutral">Close</Button>
	 *       </Sheet.Close>
	 *       <Button type="button" appearance="filled" intent="neutral">Save</Button>
	 *     </Sheet.Footer>
	 *   </Sheet.Content>
	 * </Sheet.Root>
	 * ```
	 */
	Body,
	/**
	 * The close button for a `Sheet`. Should be rendered as a child of the `Sheet.Content` component.
	 * Usually contained within the `Sheet.Footer` component.
	 * Renders an unstyled button by default, but can be customized with the `asChild` prop.
	 *
	 * @see https://mantle.ngrok.com/components/overlays/sheet#sheetclose
	 *
	 * @example
	 * ```tsx
	 * <Sheet.Root>
	 *   <Sheet.Trigger asChild>
	 *     <Button type="button" appearance="filled" intent="neutral">Open Sheet</Button>
	 *   </Sheet.Trigger>
	 *   <Sheet.Content>
	 *     <Sheet.Header>
	 *       <Sheet.TitleGroup>
	 *         <Sheet.Title>Are you absolutely sure?</Sheet.Title>
	 *         <Sheet.Actions>
	 *           <Sheet.CloseIconButton />
	 *         </Sheet.Actions>
	 *       </Sheet.TitleGroup>
	 *       <Sheet.Description>
	 *         This action cannot be undone.
	 *       </Sheet.Description>
	 *     </Sheet.Header>
	 *     <Sheet.Body>
	 *       <p>Sheet content.</p>
	 *     </Sheet.Body>
	 *     <Sheet.Footer>
	 *       <Sheet.Close asChild>
	 *         <Button type="button" appearance="outlined" intent="neutral">Close</Button>
	 *       </Sheet.Close>
	 *       <Button type="button" appearance="filled" intent="neutral">Save</Button>
	 *     </Sheet.Footer>
	 *   </Sheet.Content>
	 * </Sheet.Root>
	 * ```
	 */
	Close,
	/**
	 * An icon button that closes the `Sheet` when clicked.
	 * Should be rendered within the `Sheet.Header` as a child of `Sheet.Actions`.
	 *
	 * Composes around the mantle `IconButton` and defaults to
	 * `appearance="ghost"` and `intent="neutral"`.
	 *
	 * @see https://mantle.ngrok.com/components/overlays/sheet#sheetcloseiconbutton
	 *
	 * @example
	 * ```tsx
	 * <Sheet.Root>
	 *   <Sheet.Trigger asChild>
	 *     <Button type="button" appearance="filled" intent="neutral">Open Sheet</Button>
	 *   </Sheet.Trigger>
	 *   <Sheet.Content>
	 *     <Sheet.Header>
	 *       <Sheet.TitleGroup>
	 *         <Sheet.Title>Are you absolutely sure?</Sheet.Title>
	 *         <Sheet.Actions>
	 *           <Sheet.CloseIconButton />
	 *         </Sheet.Actions>
	 *       </Sheet.TitleGroup>
	 *       <Sheet.Description>
	 *         This action cannot be undone.
	 *       </Sheet.Description>
	 *     </Sheet.Header>
	 *     <Sheet.Body>
	 *       <p>Sheet content.</p>
	 *     </Sheet.Body>
	 *     <Sheet.Footer>
	 *       <Sheet.Close asChild>
	 *         <Button type="button" appearance="outlined" intent="neutral">Close</Button>
	 *       </Sheet.Close>
	 *       <Button type="button" appearance="filled" intent="neutral">Save</Button>
	 *     </Sheet.Footer>
	 *   </Sheet.Content>
	 * </Sheet.Root>
	 * ```
	 */
	CloseIconButton,
	/**
	 * The main container for a `Sheet`. Should be rendered as a child of the `Sheet` component.
	 * Renders on top of the overlay backdrop.
	 * Should contain the `Sheet.Header`, `Sheet.Body`, and `Sheet.Footer`.
	 *
	 * `Sheet.Content` renders its floating layer at Tailwind `z-50`, Mantle's
	 * shared floating z-index. When multiple shared layers are open, the most
	 * recently mounted layer renders on top.
	 *
	 * @see https://mantle.ngrok.com/components/overlays/sheet#sheetcontent
	 *
	 * @example
	 * ```tsx
	 * <Sheet.Root>
	 *   <Sheet.Trigger asChild>
	 *     <Button type="button" appearance="filled" intent="neutral">Open Sheet</Button>
	 *   </Sheet.Trigger>
	 *   <Sheet.Content>
	 *     <Sheet.Header>
	 *       <Sheet.TitleGroup>
	 *         <Sheet.Title>Are you absolutely sure?</Sheet.Title>
	 *         <Sheet.Actions>
	 *           <Sheet.CloseIconButton />
	 *         </Sheet.Actions>
	 *       </Sheet.TitleGroup>
	 *       <Sheet.Description>
	 *         This action cannot be undone.
	 *       </Sheet.Description>
	 *     </Sheet.Header>
	 *     <Sheet.Body>
	 *       <p>Sheet content.</p>
	 *     </Sheet.Body>
	 *     <Sheet.Footer>
	 *       <Sheet.Close asChild>
	 *         <Button type="button" appearance="outlined" intent="neutral">Close</Button>
	 *       </Sheet.Close>
	 *       <Button type="button" appearance="filled" intent="neutral">Save</Button>
	 *     </Sheet.Footer>
	 *   </Sheet.Content>
	 * </Sheet.Root>
	 * ```
	 */
	Content,
	/**
	 * A description for a sheet. Typically rendered as a child of `Sheet.Header`.
	 *
	 * @see https://mantle.ngrok.com/components/overlays/sheet#sheetdescription
	 *
	 * @example
	 * ```tsx
	 * <Sheet.Root>
	 *   <Sheet.Trigger asChild>
	 *     <Button type="button" appearance="filled" intent="neutral">Open Sheet</Button>
	 *   </Sheet.Trigger>
	 *   <Sheet.Content>
	 *     <Sheet.Header>
	 *       <Sheet.TitleGroup>
	 *         <Sheet.Title>Are you absolutely sure?</Sheet.Title>
	 *         <Sheet.Actions>
	 *           <Sheet.CloseIconButton />
	 *         </Sheet.Actions>
	 *       </Sheet.TitleGroup>
	 *       <Sheet.Description>
	 *         This action cannot be undone.
	 *       </Sheet.Description>
	 *     </Sheet.Header>
	 *     <Sheet.Body>
	 *       <p>Sheet content.</p>
	 *     </Sheet.Body>
	 *     <Sheet.Footer>
	 *       <Sheet.Close asChild>
	 *         <Button type="button" appearance="outlined" intent="neutral">Close</Button>
	 *       </Sheet.Close>
	 *       <Button type="button" appearance="filled" intent="neutral">Save</Button>
	 *     </Sheet.Footer>
	 *   </Sheet.Content>
	 * </Sheet.Root>
	 * ```
	 */
	Description,
	/**
	 * The footer container for a `Sheet`. This is where you would typically place close and submit buttons.
	 * Should be rendered as a child of `Sheet.Content`.
	 *
	 * @see https://mantle.ngrok.com/components/overlays/sheet#sheetfooter
	 *
	 * @example
	 * ```tsx
	 * <Sheet.Root>
	 *   <Sheet.Trigger asChild>
	 *     <Button type="button" appearance="filled" intent="neutral">Open Sheet</Button>
	 *   </Sheet.Trigger>
	 *   <Sheet.Content>
	 *     <Sheet.Header>
	 *       <Sheet.TitleGroup>
	 *         <Sheet.Title>Are you absolutely sure?</Sheet.Title>
	 *         <Sheet.Actions>
	 *           <Sheet.CloseIconButton />
	 *         </Sheet.Actions>
	 *       </Sheet.TitleGroup>
	 *       <Sheet.Description>
	 *         This action cannot be undone.
	 *       </Sheet.Description>
	 *     </Sheet.Header>
	 *     <Sheet.Body>
	 *       <p>Sheet content.</p>
	 *     </Sheet.Body>
	 *     <Sheet.Footer>
	 *       <Sheet.Close asChild>
	 *         <Button type="button" appearance="outlined" intent="neutral">Close</Button>
	 *       </Sheet.Close>
	 *       <Button type="button" appearance="filled" intent="neutral">Save</Button>
	 *     </Sheet.Footer>
	 *   </Sheet.Content>
	 * </Sheet.Root>
	 * ```
	 */
	Footer,
	/**
	 * The header container for a `Sheet`. This is where you would typically place the title, description, and actions.
	 * Should be rendered as a child of `Sheet.Content`.
	 *
	 * @see https://mantle.ngrok.com/components/overlays/sheet#sheetheader
	 *
	 * @example
	 * ```tsx
	 * <Sheet.Root>
	 *   <Sheet.Trigger asChild>
	 *     <Button type="button" appearance="filled" intent="neutral">Open Sheet</Button>
	 *   </Sheet.Trigger>
	 *   <Sheet.Content>
	 *     <Sheet.Header>
	 *       <Sheet.TitleGroup>
	 *         <Sheet.Title>Are you absolutely sure?</Sheet.Title>
	 *         <Sheet.Actions>
	 *           <Sheet.CloseIconButton />
	 *         </Sheet.Actions>
	 *       </Sheet.TitleGroup>
	 *       <Sheet.Description>
	 *         This action cannot be undone.
	 *       </Sheet.Description>
	 *     </Sheet.Header>
	 *     <Sheet.Body>
	 *       <p>Sheet content.</p>
	 *     </Sheet.Body>
	 *     <Sheet.Footer>
	 *       <Sheet.Close asChild>
	 *         <Button type="button" appearance="outlined" intent="neutral">Close</Button>
	 *       </Sheet.Close>
	 *       <Button type="button" appearance="filled" intent="neutral">Save</Button>
	 *     </Sheet.Footer>
	 *   </Sheet.Content>
	 * </Sheet.Root>
	 * ```
	 */
	Header,
	/**
	 * The title for a `Sheet`. Typically rendered as a child of `Sheet.TitleGroup`.
	 * Defaults to an `h2` element, but can be changed via the `asChild` prop.
	 *
	 * @see https://mantle.ngrok.com/components/overlays/sheet#sheettitle
	 *
	 * @example
	 * ```tsx
	 * <Sheet.Root>
	 *   <Sheet.Trigger asChild>
	 *     <Button type="button" appearance="filled" intent="neutral">Open Sheet</Button>
	 *   </Sheet.Trigger>
	 *   <Sheet.Content>
	 *     <Sheet.Header>
	 *       <Sheet.TitleGroup>
	 *         <Sheet.Title>Are you absolutely sure?</Sheet.Title>
	 *         <Sheet.Actions>
	 *           <Sheet.CloseIconButton />
	 *         </Sheet.Actions>
	 *       </Sheet.TitleGroup>
	 *       <Sheet.Description>
	 *         This action cannot be undone.
	 *       </Sheet.Description>
	 *     </Sheet.Header>
	 *     <Sheet.Body>
	 *       <p>Sheet content.</p>
	 *     </Sheet.Body>
	 *     <Sheet.Footer>
	 *       <Sheet.Close asChild>
	 *         <Button type="button" appearance="outlined" intent="neutral">Close</Button>
	 *       </Sheet.Close>
	 *       <Button type="button" appearance="filled" intent="neutral">Save</Button>
	 *     </Sheet.Footer>
	 *   </Sheet.Content>
	 * </Sheet.Root>
	 * ```
	 */
	Title,
	/**
	 * A group container for the title and actions of a sheet. Typically rendered as a child of `Sheet.Header`.
	 *
	 * @see https://mantle.ngrok.com/components/overlays/sheet#sheettitlegroup
	 *
	 * @example
	 * ```tsx
	 * <Sheet.Root>
	 *   <Sheet.Trigger asChild>
	 *     <Button type="button" appearance="filled" intent="neutral">Open Sheet</Button>
	 *   </Sheet.Trigger>
	 *   <Sheet.Content>
	 *     <Sheet.Header>
	 *       <Sheet.TitleGroup>
	 *         <Sheet.Title>Are you absolutely sure?</Sheet.Title>
	 *         <Sheet.Actions>
	 *           <Sheet.CloseIconButton />
	 *         </Sheet.Actions>
	 *       </Sheet.TitleGroup>
	 *       <Sheet.Description>
	 *         This action cannot be undone.
	 *       </Sheet.Description>
	 *     </Sheet.Header>
	 *     <Sheet.Body>
	 *       <p>Sheet content.</p>
	 *     </Sheet.Body>
	 *     <Sheet.Footer>
	 *       <Sheet.Close asChild>
	 *         <Button type="button" appearance="outlined" intent="neutral">Close</Button>
	 *       </Sheet.Close>
	 *       <Button type="button" appearance="filled" intent="neutral">Save</Button>
	 *     </Sheet.Footer>
	 *   </Sheet.Content>
	 * </Sheet.Root>
	 * ```
	 */
	TitleGroup,
	/**
	 * The button trigger for a `Sheet`. Should be rendered as a child of the `Sheet` component.
	 * Renders an unstyled button by default, but can be customized with the `asChild` prop.
	 *
	 * @see https://mantle.ngrok.com/components/overlays/sheet#sheettrigger
	 *
	 * @example
	 * ```tsx
	 * <Sheet.Root>
	 *   <Sheet.Trigger asChild>
	 *     <Button type="button" appearance="filled" intent="neutral">Open Sheet</Button>
	 *   </Sheet.Trigger>
	 *   <Sheet.Content>
	 *     <Sheet.Header>
	 *       <Sheet.TitleGroup>
	 *         <Sheet.Title>Are you absolutely sure?</Sheet.Title>
	 *         <Sheet.Actions>
	 *           <Sheet.CloseIconButton />
	 *         </Sheet.Actions>
	 *       </Sheet.TitleGroup>
	 *       <Sheet.Description>
	 *         This action cannot be undone.
	 *       </Sheet.Description>
	 *     </Sheet.Header>
	 *     <Sheet.Body>
	 *       <p>Sheet content.</p>
	 *     </Sheet.Body>
	 *     <Sheet.Footer>
	 *       <Sheet.Close asChild>
	 *         <Button type="button" appearance="outlined" intent="neutral">Close</Button>
	 *       </Sheet.Close>
	 *       <Button type="button" appearance="filled" intent="neutral">Save</Button>
	 *     </Sheet.Footer>
	 *   </Sheet.Content>
	 * </Sheet.Root>
	 * ```
	 */
	Trigger,
} as const;

export {
	//,
	Sheet,
};
