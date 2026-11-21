/**
 * The presentation that `@ngrok/mantle/dialog` and `@ngrok/mantle/dialog/native`
 * share: the class recipes and the parts with no behavior. Each backend adds
 * its own positioning motion and its own behavior parts.
 */

import { XIcon } from "@phosphor-icons/react/X";
import type { ComponentProps } from "react";
import { cx } from "../../utils/cx/cx.js";
import type { WithDataSlot } from "../../utils/data-slot.js";
import { joinDataSlot } from "../../utils/data-slot.js";
import {
	IconButton,
	type IconButtonAppearance,
	type IconButtonIntent,
	type IconButtonProps,
} from "../button/icon-button.js";

/**
 * How much of the viewport a `Dialog.Content` claims, and what it looks like
 * there. The three values move together as one decision, because a dialog that
 * fills the viewport has no width to cap and no corner left to round.
 *
 * - `"centered"`: a card capped at `preferredWidth`, inset 16px from every
 *   viewport edge, rounded and bordered.
 * - `"full-page"`: fills that same 16px-inset box, still rounded and bordered.
 * - `"full-bleed"`: fills the whole viewport, square and unbordered.
 */
type DialogAppearance = "centered" | "full-page" | "full-bleed";

/**
 * The viewport inset each {@link DialogAppearance} positions its content in. A
 * complete `Record` (not cva) so adding an appearance without its classes is a
 * compile error.
 */
const wrapperClassName: Record<DialogAppearance, string> = {
	centered: "inset-4",
	"full-page": "inset-4",
	"full-bleed": "inset-0",
};

/**
 * The box each {@link DialogAppearance} paints inside that inset. `"centered"`
 * takes its width from `preferredWidth` instead, so it sets none here.
 */
const contentClassName: Record<DialogAppearance, string> = {
	centered: "border-dialog rounded-xl border",
	"full-page": "border-dialog h-full max-w-none rounded-xl border",
	"full-bleed": "h-full max-w-none",
};

/**
 * The props of `Dialog.Content` that decide its box: `appearance` and the
 * `preferredWidth` that only a `"centered"` dialog takes.
 */
type DialogLayoutProps =
	| {
			/**
			 * How much of the viewport the dialog claims. `"centered"` is a card
			 * capped at `preferredWidth`; `"full-page"` fills the 16px-inset box
			 * `Dialog.Content` already positions itself in; `"full-bleed"` fills the
			 * viewport edge to edge, square and unbordered.
			 *
			 * Reflected as `data-appearance`.
			 *
			 * @default "centered"
			 */
			appearance?: "centered";
			/**
			 * The maximum width of a `"centered"` dialog, as a Tailwind `max-w-`
			 * class. The dialog stays responsive below it.
			 *
			 * @default "max-w-lg"
			 */
			preferredWidth?: `max-w-${string}`;
	  }
	| {
			/**
			 * How much of the viewport the dialog claims. `"full-page"` fills the
			 * 16px-inset box `Dialog.Content` already positions itself in;
			 * `"full-bleed"` fills the whole viewport, square and unbordered.
			 *
			 * Reflected as `data-appearance`.
			 */
			appearance: "full-page" | "full-bleed";
			/**
			 * Never set here. A `"full-page"` or `"full-bleed"` dialog fills its box,
			 * so it has no width to cap. Pass `appearance="centered"` to cap it.
			 */
			preferredWidth?: never;
	  };

/**
 * The classes of the `Dialog.Content` surface for a layout, without motion.
 *
 * @example
 * ```ts
 * contentSurfaceClassName({ appearance: "centered", preferredWidth: undefined }); // a card capped at `max-w-lg`
 * ```
 */
function contentSurfaceClassName({
	appearance,
	preferredWidth,
}: {
	appearance: DialogAppearance;
	preferredWidth: string | undefined;
}) {
	return cx(
		"flex max-h-full w-full flex-1 flex-col",
		"outline-hidden focus-within:outline-hidden",
		"bg-dialog shadow-lg",
		contentClassName[appearance],
		appearance === "centered" && (preferredWidth ?? "max-w-lg"),
	);
}

/** The classes of `Dialog.Title`. */
const titleClassName = "text-strong truncate text-lg font-medium";

/** The classes of `Dialog.Description`. */
const descriptionClassName = "text-muted";

/**
 * Contains the title, the description, and the close button of the dialog.
 * `Dialog.Title` and `Dialog.Description` stack in a column. Every other child
 * shares the title's row, so a long title truncates beside
 * `Dialog.CloseIconButton`.
 *
 * The stack keys on the `data-slot` of each direct child. If a wrapper holds
 * the title and the description, the wrapper owns their layout.
 *
 * @see https://mantle.ngrok.com/components/overlays/dialog#dialogheader
 *
 * @example
 * ```tsx
 * <Dialog.Root>
 *   <Dialog.Trigger asChild>
 *     <Button type="button" appearance="filled" intent="neutral">Open Dialog</Button>
 *   </Dialog.Trigger>
 *   <Dialog.Content>
 *     <Dialog.Header>
 *       <Dialog.Title>Dialog Title</Dialog.Title>
 *       <Dialog.Description>This is an optional description.</Dialog.Description>
 *       <Dialog.CloseIconButton />
 *     </Dialog.Header>
 *     <Dialog.Body>
 *       <p>This is the dialog content.</p>
 *     </Dialog.Body>
 *     <Dialog.Footer>
 *       <Dialog.Close asChild>
 *         <Button type="button" appearance="outlined" intent="neutral">Cancel</Button>
 *       </Dialog.Close>
 *       <Button type="button" appearance="filled" intent="neutral">Save</Button>
 *     </Dialog.Footer>
 *   </Dialog.Content>
 * </Dialog.Root>
 * ```
 */
const Header = ({
	"data-slot": dataSlot,
	className,
	children,
	...props
}: ComponentProps<"div"> & WithDataSlot) => (
	<div
		data-slot={joinDataSlot(dataSlot, "dialog-header")}
		className={cx(
			"border-dialog-muted text-strong relative flex shrink-0 flex-wrap items-center justify-between gap-2 border-b px-6 py-4",
			// Why `flex-1` and `order-last`: a zero flex basis keeps a long title on
			// the close button's row. The description orders last so it wraps under both.
			"*:data-[slot~=dialog-title]:flex-1",
			"*:data-[slot~=dialog-description]:order-last *:data-[slot~=dialog-description]:basis-full",
			"has-[.icon-button]:pr-4", // when there are actions in the header, shorten the padding
			className,
		)}
		{...props}
	>
		{children}
	</div>
);

type CloseIconButtonProps = Partial<Omit<IconButtonProps, "appearance" | "icon" | "intent">> & {
	/**
	 * The visual style of the close icon button. Optional here:
	 * `Dialog.CloseIconButton` defaults to `"ghost"` so the close affordance
	 * stays visually quiet in the dialog header.
	 *
	 * @default "ghost"
	 */
	appearance?: IconButtonAppearance;
	/**
	 * The tone of the close icon button. Optional here:
	 * `Dialog.CloseIconButton` defaults to `"neutral"`, the workhorse tone for
	 * routine actions like dismissing a dialog, and the only tone `IconButton`
	 * draws.
	 *
	 * @default "neutral"
	 */
	intent?: IconButtonIntent;
} & WithDataSlot;

/**
 * The look of `Dialog.CloseIconButton`. Each backend wraps it in its own
 * `Close` part, which adds the close behavior.
 *
 * @example
 * ```tsx
 * <DialogPrimitiveClose asChild>
 *   <CloseIconButtonView />
 * </DialogPrimitiveClose>
 * ```
 */
const CloseIconButtonView = ({
	"data-slot": dataSlot,
	size = "md",
	type = "button",
	label = "Close Dialog",
	appearance = "ghost",
	intent = "neutral",
	...props
}: CloseIconButtonProps) => (
	<IconButton
		appearance={appearance}
		data-slot={joinDataSlot(dataSlot, "dialog-close-icon-button")}
		icon={<XIcon />}
		intent={intent}
		label={label}
		size={size}
		type={type}
		{...props}
	/>
);

/**
 * Contains the main content of the dialog.
 *
 * @see https://mantle.ngrok.com/components/overlays/dialog#dialogbody
 *
 * @example
 * ```tsx
 * <Dialog.Root>
 *   <Dialog.Trigger asChild>
 *     <Button type="button" appearance="filled" intent="neutral">Open Dialog</Button>
 *   </Dialog.Trigger>
 *   <Dialog.Content>
 *     <Dialog.Header>
 *       <Dialog.Title>Dialog Title</Dialog.Title>
 *       <Dialog.Description>This is an optional description.</Dialog.Description>
 *       <Dialog.CloseIconButton />
 *     </Dialog.Header>
 *     <Dialog.Body>
 *       <p>This is the dialog content.</p>
 *     </Dialog.Body>
 *     <Dialog.Footer>
 *       <Dialog.Close asChild>
 *         <Button type="button" appearance="outlined" intent="neutral">Cancel</Button>
 *       </Dialog.Close>
 *       <Button type="button" appearance="filled" intent="neutral">Save</Button>
 *     </Dialog.Footer>
 *   </Dialog.Content>
 * </Dialog.Root>
 * ```
 */
const Body = ({
	"data-slot": dataSlot,
	className,
	...props
}: ComponentProps<"div"> & WithDataSlot) => (
	<div
		data-slot={joinDataSlot(dataSlot, "dialog-body")}
		className={cx(
			"scrollbar scrollbar-gutter-stable text-body flex-1 overflow-y-auto p-6",
			className,
		)}
		{...props}
	/>
);

/**
 * Contains the footer content of the dialog, including action buttons.
 *
 * @see https://mantle.ngrok.com/components/overlays/dialog#dialogfooter
 *
 * @example
 * ```tsx
 * <Dialog.Root>
 *   <Dialog.Trigger asChild>
 *     <Button type="button" appearance="filled" intent="neutral">Open Dialog</Button>
 *   </Dialog.Trigger>
 *   <Dialog.Content>
 *     <Dialog.Header>
 *       <Dialog.Title>Dialog Title</Dialog.Title>
 *       <Dialog.Description>This is an optional description.</Dialog.Description>
 *       <Dialog.CloseIconButton />
 *     </Dialog.Header>
 *     <Dialog.Body>
 *       <p>This is the dialog content.</p>
 *     </Dialog.Body>
 *     <Dialog.Footer>
 *       <Dialog.Close asChild>
 *         <Button type="button" appearance="outlined" intent="neutral">Cancel</Button>
 *       </Dialog.Close>
 *       <Button type="button" appearance="filled" intent="neutral">Save</Button>
 *     </Dialog.Footer>
 *   </Dialog.Content>
 * </Dialog.Root>
 * ```
 */
const Footer = ({
	"data-slot": dataSlot,
	className,
	...props
}: ComponentProps<"div"> & WithDataSlot) => (
	<div
		data-slot={joinDataSlot(dataSlot, "dialog-footer")}
		className={cx(
			"border-dialog-muted flex shrink-0 justify-end gap-2 border-t px-6 py-4",
			className,
		)}
		{...props}
	/>
);

export {
	//,
	Body,
	CloseIconButtonView,
	contentSurfaceClassName,
	descriptionClassName,
	Footer,
	Header,
	titleClassName,
	wrapperClassName,
};

export type {
	//,
	CloseIconButtonProps,
	DialogAppearance,
	DialogLayoutProps,
};
