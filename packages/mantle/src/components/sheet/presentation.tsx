/**
 * The presentation that `@ngrok/mantle/sheet` and `@ngrok/mantle/sheet/native`
 * share: the class recipes and the parts with no behavior. Each backend adds
 * its own slide motion and its own behavior parts.
 */

import { XIcon } from "@phosphor-icons/react/X";
import type { ComponentProps, HTMLAttributes } from "react";
import type { SelfClosingWithAsChild } from "../../types/as-child.js";
import { cx } from "../../utils/cx/cx.js";
import type { WithDataSlot } from "../../utils/data-slot.js";
import { joinDataSlot } from "../../utils/data-slot.js";
import {
	IconButton,
	type IconButtonAppearance,
	type IconButtonIntent,
	type IconButtonProps,
} from "../button/icon-button.js";

/** The side of the screen a sheet slides in from. */
type SheetSide = "left" | "right";

/**
 * The props of `Sheet.Content` that decide its box.
 */
type SheetLayoutProps = {
	/**
	 * The side of the screen the sheet should slide in from.
	 *
	 * @default "right"
	 */
	side?: SheetSide;
	/**
	 * The preferred width of the `Sheet.Content` as a tailwind `max-w-` class.
	 *
	 * By default, a `Sheet`'s content width is responsive with a default
	 * preferred width: the maximum width of the `Sheet.Content` when the window
	 * viewport is larger than the mobile breakpoint (`sm`).
	 *
	 * @default `sm:max-w-120`
	 */
	preferredWidth?: `sm:max-w-${string}`;
};

/**
 * The edge each {@link SheetSide} pins the sheet to. A complete `Record` so a
 * new side without its classes is a compile error.
 */
const sideClassName: Record<SheetSide, string> = {
	left: "left-0 border-r",
	right: "right-0 border-l",
};

/**
 * The classes of the `Sheet.Content` surface for a side, without motion.
 *
 * @example
 * ```ts
 * contentSurfaceClassName({ side: "left", preferredWidth: "sm:max-w-120" }); // pinned to the left edge
 * ```
 */
function contentSurfaceClassName({
	side,
	preferredWidth,
}: {
	side: SheetSide;
	preferredWidth: string;
}) {
	return cx(
		"bg-dialog border-dialog fixed inset-y-0 flex h-full w-full flex-col shadow-lg outline-hidden focus-within:outline-hidden",
		sideClassName[side],
		preferredWidth,
	);
}

/** The classes of `Sheet.Title`. */
const titleClassName = "text-strong flex-1 truncate text-lg font-medium";

/** The classes of `Sheet.Description`. */
const descriptionClassName = "text-body text-sm";

type CloseIconButtonProps = Partial<
	Omit<IconButtonProps, "icon" | "appearance" | "asChild" | "children" | "intent">
> & {
	/**
	 * The visual style of the close icon button. Optional here:
	 * `Sheet.CloseIconButton` defaults to `"ghost"` so it stays visually quiet
	 * in the `Sheet.Header` beside the title.
	 *
	 * @default "ghost"
	 */
	appearance?: IconButtonAppearance;
	/**
	 * The tone of the close icon button. Optional here: `Sheet.CloseIconButton`
	 * defaults to `"neutral"`, the workhorse tone for routine dismissal, and the
	 * only tone `IconButton` draws.
	 *
	 * @default "neutral"
	 */
	intent?: IconButtonIntent;
} & SelfClosingWithAsChild &
	WithDataSlot;

/**
 * The look of `Sheet.CloseIconButton`. Each backend wraps it in its own
 * `Close` part, which adds the close behavior.
 *
 * @example
 * ```tsx
 * <SheetPrimitiveClose asChild>
 *   <CloseIconButtonView />
 * </SheetPrimitiveClose>
 * ```
 */
const CloseIconButtonView = ({
	"data-slot": dataSlot,
	size = "md",
	type = "button",
	label = "Close Sheet",
	appearance = "ghost",
	intent = "neutral",
	...props
}: CloseIconButtonProps) => (
	<IconButton
		data-slot={joinDataSlot(dataSlot, "sheet-close-icon-button")}
		appearance={appearance}
		icon={<XIcon />}
		intent={intent}
		label={label}
		size={size}
		type={type}
		{...props}
	/>
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
const Body = ({
	"data-slot": dataSlot,
	className,
	...props
}: HTMLAttributes<HTMLDivElement> & WithDataSlot) => (
	<div
		data-slot={joinDataSlot(dataSlot, "sheet-body")}
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
const Header = ({
	"data-slot": dataSlot,
	className,
	...props
}: HTMLAttributes<HTMLDivElement> & WithDataSlot) => (
	<div
		data-slot={joinDataSlot(dataSlot, "sheet-header")}
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
const Footer = ({
	"data-slot": dataSlot,
	className,
	...props
}: HTMLAttributes<HTMLDivElement> & WithDataSlot) => (
	<div
		data-slot={joinDataSlot(dataSlot, "sheet-footer")}
		className={cx(
			"border-dialog-muted flex shrink-0 justify-end gap-2 border-t px-6 py-2.5",
			className,
		)}
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
const TitleGroup = ({
	"data-slot": dataSlot,
	children,
	className,
	ref,
	...props
}: ComponentProps<"div"> & WithDataSlot) => (
	<div
		data-slot={joinDataSlot(dataSlot, "sheet-title-group")}
		className={cx("flex items-center justify-between gap-2", className)}
		{...props}
		ref={ref}
	>
		{children}
	</div>
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
const Actions = ({
	"data-slot": dataSlot,
	children,
	className,
	ref,
	...props
}: ComponentProps<"div"> & WithDataSlot) => (
	<div
		data-slot={joinDataSlot(dataSlot, "sheet-actions")}
		className={cx("flex h-full items-center gap-2", className)}
		{...props}
		ref={ref}
	>
		{children}
	</div>
);

export {
	//,
	Actions,
	Body,
	CloseIconButtonView,
	contentSurfaceClassName,
	descriptionClassName,
	Footer,
	Header,
	titleClassName,
	TitleGroup,
};

export type {
	//,
	CloseIconButtonProps,
	SheetLayoutProps,
	SheetSide,
};
