"use client";

import { InfoIcon } from "@phosphor-icons/react/Info";
import { WarningIcon } from "@phosphor-icons/react/Warning";
import { type ComponentProps, type ReactNode, createContext, useContext, useMemo } from "react";
import invariant from "tiny-invariant";
import type { WithAsChild } from "../../types/as-child.js";
import { cx } from "../../utils/cx/cx.js";
import type { WithDataSlot } from "../../utils/data-slot.js";
import { joinDataSlot } from "../../utils/data-slot.js";
import { Button, type ButtonAppearance, type ButtonProps } from "../button/button.js";
import type { ButtonIntent } from "../button/intents.js";
import {
	Close as AlertDialogPrimitiveClose,
	Content as AlertDialogPrimitiveContent,
	createScope,
	Description as AlertDialogPrimitiveDescription,
	Root as AlertDialogPrimitiveRoot,
	type RootProps,
	Title as AlertDialogPrimitiveTitle,
	Trigger as AlertDialogPrimitiveTrigger,
} from "../dialog/native-primitive.js";
import { SvgOnly } from "../icon/svg-only.js";
import type { SvgAttributes } from "../icon/types.js";
import { Slot } from "../slot/index.js";

/** The scope that ties the `AlertDialog` parts to their `Root`. */
const scope = createScope();

const intents = ["info", "danger"] as const;
type AlertDialogIntent = (typeof intents)[number];

type AlertDialogContextValue = {
	intent: AlertDialogIntent;
};

const AlertDialogContext = createContext<AlertDialogContextValue | null>(null);

function useAlertDialogContext() {
	const context = useContext(AlertDialogContext);
	invariant(context, "AlertDialog parts must be rendered inside AlertDialog.Root.");
	return context;
}

type AlertDialogProps = Omit<RootProps, "scope"> & {
	/**
	 * The intent of the AlertDialog: the tone its color communicates to the
	 * user, affecting the color and styling of descendants like
	 * `AlertDialog.Icon` and `AlertDialog.Action`.
	 */
	intent: AlertDialogIntent;
};

/**
 * A modal dialog that interrupts the user with important content and expects a
 * response. Holds the open state and the `intent` that `AlertDialog.Icon` and
 * `AlertDialog.Action` read.
 *
 * `AlertDialog` renders its floating layer at Tailwind `z-60`, Mantle's overlay
 * tier, above every float (`z-50`). Floats composed inside the content portal
 * into the positioner (`data-slot="alert-dialog-positioner"`) and paint above
 * the content. When multiple overlays are open, the most recently mounted
 * overlay renders on top.
 *
 * @see https://mantle.ngrok.com/components/overlays/alert-dialog#alertdialogroot
 *
 * @example
 * ```tsx
 * <AlertDialog.Root intent="danger">
 *   <AlertDialog.Trigger asChild>
 *     <Button type="button" appearance="outlined" intent="neutral">
 *       Show Danger Alert Dialog
 *     </Button>
 *   </AlertDialog.Trigger>
 *   <AlertDialog.Content>
 *     <AlertDialog.Icon />
 *     <AlertDialog.Body>
 *       <AlertDialog.Header>
 *         <AlertDialog.Title>
 *           Are you absolutely sure?
 *         </AlertDialog.Title>
 *         <AlertDialog.Description>
 *           Proident quis nisi tempor irure sunt ut minim occaecat mollit sunt.
 *         </AlertDialog.Description>
 *       </AlertDialog.Header>
 *       <AlertDialog.Footer>
 *         <AlertDialog.Cancel type="button">Cancel</AlertDialog.Cancel>
 *         <AlertDialog.Action type="button">
 *           Continue
 *         </AlertDialog.Action>
 *       </AlertDialog.Footer>
 *     </AlertDialog.Body>
 *   </AlertDialog.Content>
 * </AlertDialog.Root>
 * ```
 */
function Root({ intent, ...props }: AlertDialogProps) {
	const context: AlertDialogContextValue = useMemo(() => ({ intent }), [intent]);

	return (
		<AlertDialogContext.Provider value={context}>
			<AlertDialogPrimitiveRoot scope={scope} {...props} />
		</AlertDialogContext.Provider>
	);
}

/**
 * A button that opens the Alert Dialog.
 *
 * @see https://mantle.ngrok.com/components/overlays/alert-dialog#alertdialogtrigger
 *
 * @example
 * ```tsx
 * <AlertDialog.Root intent="danger">
 *   <AlertDialog.Trigger asChild>
 *     <Button type="button" appearance="outlined" intent="neutral">
 *       Show Danger Alert Dialog
 *     </Button>
 *   </AlertDialog.Trigger>
 *   <AlertDialog.Content>
 *     <AlertDialog.Icon />
 *     <AlertDialog.Body>
 *       <AlertDialog.Header>
 *         <AlertDialog.Title>
 *           Are you absolutely sure?
 *         </AlertDialog.Title>
 *         <AlertDialog.Description>
 *           Proident quis nisi tempor irure sunt ut minim occaecat mollit sunt.
 *         </AlertDialog.Description>
 *       </AlertDialog.Header>
 *       <AlertDialog.Footer>
 *         <AlertDialog.Cancel type="button">Cancel</AlertDialog.Cancel>
 *         <AlertDialog.Action type="button">
 *           Continue
 *         </AlertDialog.Action>
 *       </AlertDialog.Footer>
 *     </AlertDialog.Body>
 *   </AlertDialog.Content>
 * </AlertDialog.Root>
 * ```
 */
const Trigger = ({
	"data-slot": dataSlot,
	ref,
	...props
}: Omit<ComponentProps<typeof AlertDialogPrimitiveTrigger>, "scope"> & WithDataSlot) => (
	<AlertDialogPrimitiveTrigger
		scope={scope}
		ref={ref}
		data-slot={joinDataSlot(dataSlot, "alert-dialog-trigger")}
		{...props}
	/>
);

type AlertDialogContentProps = Omit<
	ComponentProps<typeof AlertDialogPrimitiveContent>,
	"positionerClassName" | "positionerSlot" | "scope" | "inline" | "layer" | "role"
> & {
	/**
	 * The preferred width of the `AlertDialogContent` as a tailwind `max-w-` class.
	 *
	 * By default, a `AlertDialog`'s content width is responsive with a default
	 * preferred width: the maximum width of the `AlertDialogContent`
	 *
	 * @default `max-w-md`
	 */
	preferredWidth?: `max-w-${string}`;
} & WithDataSlot;

/**
 * The popover alert dialog container.
 *
 * Renders on top of the overlay and is centered in the viewport. It carries
 * `role="alertdialog"`, and a pointer interaction outside the content does not
 * close it: the user must acknowledge the dialog through `AlertDialog.Cancel`,
 * `AlertDialog.Close`, or the Escape key.
 *
 * `AlertDialog.Content` renders its floating layer at Tailwind `z-60`, Mantle's
 * overlay tier, above every float (`z-50`). Floats composed inside the content
 * portal into the positioner (`data-slot="alert-dialog-positioner"`) and paint
 * above the content. When multiple overlays are open, the most recently mounted
 * overlay renders on top.
 *
 * A modal alert dialog makes the rest of the page inert, so UI outside it
 * takes no input while it is open. mantle's `Toaster` and `Sandbar` move into
 * the open alert dialog, so they stay usable. With `modal={false}`, UI with the
 * `overlay-prompt` class takes clicks above the alert dialog: a click inside it
 * does not count as an outside click.
 *
 * A script can show its own popup in a frame on `<body>`, such as the 3-D
 * Secure challenge of a payment script. Set `modal={false}` on an alert dialog
 * that holds such a flow: a modal alert dialog makes the frame inert and covers
 * it. While that frame is on top at the center of the viewport, a non-modal
 * alert dialog yields to the popup. Focus that a script moves into the popup
 * stays there. Escape moves focus into the popup and does not close the alert
 * dialog.
 *
 * @see https://mantle.ngrok.com/components/overlays/alert-dialog#alertdialogcontent
 *
 * @example
 * ```tsx
 * <AlertDialog.Root intent="danger">
 *   <AlertDialog.Trigger asChild>
 *     <Button type="button" appearance="outlined" intent="neutral">
 *       Show Danger Alert Dialog
 *     </Button>
 *   </AlertDialog.Trigger>
 *   <AlertDialog.Content>
 *     <AlertDialog.Icon />
 *     <AlertDialog.Body>
 *       <AlertDialog.Header>
 *         <AlertDialog.Title>
 *           Are you absolutely sure?
 *         </AlertDialog.Title>
 *         <AlertDialog.Description>
 *           Proident quis nisi tempor irure sunt ut minim occaecat mollit sunt.
 *         </AlertDialog.Description>
 *       </AlertDialog.Header>
 *       <AlertDialog.Footer>
 *         <AlertDialog.Cancel type="button">Cancel</AlertDialog.Cancel>
 *         <AlertDialog.Action type="button">
 *           Continue
 *         </AlertDialog.Action>
 *       </AlertDialog.Footer>
 *     </AlertDialog.Body>
 *   </AlertDialog.Content>
 * </AlertDialog.Root>
 * ```
 */
const Content = ({
	"data-slot": dataSlot,
	className,
	onInteractOutside,
	preferredWidth = "max-w-md",
	...props
}: AlertDialogContentProps) => (
	<AlertDialogPrimitiveContent
		scope={scope}
		role="alertdialog"
		positionerSlot="alert-dialog-positioner"
		// Why `open:flex`: a `display` class would show a closed `<dialog>`.
		positionerClassName="fixed inset-4 z-60 items-center justify-center open:flex"
		data-slot={joinDataSlot(dataSlot, "alert-dialog-content")}
		onInteractOutside={(event) => {
			onInteractOutside?.(event);
			// Why: an alert dialog expects an explicit response, so a click on
			// the backdrop must not dismiss it. Escape and the close parts still do.
			event.preventDefault();
		}}
		className={cx(
			"flex w-full flex-1 flex-col items-center gap-4 sm:flex-row sm:items-start",
			// Why `overscroll-none`: a long alert scrolls in the panel, with no
			// bounce and no scroll that chains to the page.
			"max-h-full overflow-y-auto overscroll-none",
			"outline-hidden focus-within:outline-hidden",
			"p-6",
			"border-dialog bg-dialog rounded-xl border shadow-lg duration-200 ease-out-strong data-closing:duration-150 motion-reduce:animate-none!",
			"data-closing:animate-out data-closing:fade-out-0 data-closing:zoom-out-95 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95",
			preferredWidth,
			className,
		)}
		{...props}
	/>
);

/**
 * Contains the main content of the alert dialog.
 *
 * @see https://mantle.ngrok.com/components/overlays/alert-dialog#alertdialogbody
 *
 * @example
 * ```tsx
 * <AlertDialog.Root intent="danger">
 *   <AlertDialog.Trigger asChild>
 *     <Button type="button" appearance="outlined" intent="neutral">
 *       Show Danger Alert Dialog
 *     </Button>
 *   </AlertDialog.Trigger>
 *   <AlertDialog.Content>
 *     <AlertDialog.Icon />
 *     <AlertDialog.Body>
 *       <AlertDialog.Header>
 *         <AlertDialog.Title>
 *           Are you absolutely sure?
 *         </AlertDialog.Title>
 *         <AlertDialog.Description>
 *           Proident quis nisi tempor irure sunt ut minim occaecat mollit sunt.
 *         </AlertDialog.Description>
 *       </AlertDialog.Header>
 *       <AlertDialog.Footer>
 *         <AlertDialog.Cancel type="button">Cancel</AlertDialog.Cancel>
 *         <AlertDialog.Action type="button">
 *           Continue
 *         </AlertDialog.Action>
 *       </AlertDialog.Footer>
 *     </AlertDialog.Body>
 *   </AlertDialog.Content>
 * </AlertDialog.Root>
 * ```
 */
const Body = ({
	"data-slot": dataSlot,
	asChild = false,
	className,
	ref,
	...props
}: ComponentProps<"div"> & WithAsChild & WithDataSlot) => {
	const Component = asChild ? Slot : "div";

	return (
		<Component
			data-slot={joinDataSlot(dataSlot, "alert-dialog-body")}
			className={cx("flex-1 space-y-4", className)}
			ref={ref}
			{...props}
		/>
	);
};

/**
 * Contains the header content of the dialog, including the title and description.
 *
 * @see https://mantle.ngrok.com/components/overlays/alert-dialog#alertdialogheader
 *
 * @example
 * ```tsx
 * <AlertDialog.Root intent="danger">
 *   <AlertDialog.Trigger asChild>
 *     <Button type="button" appearance="outlined" intent="neutral">
 *       Show Danger Alert Dialog
 *     </Button>
 *   </AlertDialog.Trigger>
 *   <AlertDialog.Content>
 *     <AlertDialog.Icon />
 *     <AlertDialog.Body>
 *       <AlertDialog.Header>
 *         <AlertDialog.Title>
 *           Are you absolutely sure?
 *         </AlertDialog.Title>
 *         <AlertDialog.Description>
 *           Proident quis nisi tempor irure sunt ut minim occaecat mollit sunt.
 *         </AlertDialog.Description>
 *       </AlertDialog.Header>
 *       <AlertDialog.Footer>
 *         <AlertDialog.Cancel type="button">Cancel</AlertDialog.Cancel>
 *         <AlertDialog.Action type="button">
 *           Continue
 *         </AlertDialog.Action>
 *       </AlertDialog.Footer>
 *     </AlertDialog.Body>
 *   </AlertDialog.Content>
 * </AlertDialog.Root>
 * ```
 */
const Header = ({
	"data-slot": dataSlot,
	asChild = false,
	className,
	ref,
	...props
}: ComponentProps<"div"> & WithAsChild & WithDataSlot) => {
	const Component = asChild ? Slot : "div";

	return (
		<Component
			data-slot={joinDataSlot(dataSlot, "alert-dialog-header")}
			className={cx("flex flex-col space-y-2 text-center sm:text-start", className)}
			ref={ref}
			{...props}
		/>
	);
};

/**
 * Contains the footer content of the dialog, including the action and cancel buttons.
 *
 * @see https://mantle.ngrok.com/components/overlays/alert-dialog#alertdialogfooter
 *
 * @example
 * ```tsx
 * <AlertDialog.Root intent="danger">
 *   <AlertDialog.Trigger asChild>
 *     <Button type="button" appearance="outlined" intent="neutral">
 *       Show Danger Alert Dialog
 *     </Button>
 *   </AlertDialog.Trigger>
 *   <AlertDialog.Content>
 *     <AlertDialog.Icon />
 *     <AlertDialog.Body>
 *       <AlertDialog.Header>
 *         <AlertDialog.Title>
 *           Are you absolutely sure?
 *         </AlertDialog.Title>
 *         <AlertDialog.Description>
 *           Proident quis nisi tempor irure sunt ut minim occaecat mollit sunt.
 *         </AlertDialog.Description>
 *       </AlertDialog.Header>
 *       <AlertDialog.Footer>
 *         <AlertDialog.Cancel type="button">Cancel</AlertDialog.Cancel>
 *         <AlertDialog.Action type="button">
 *           Continue
 *         </AlertDialog.Action>
 *       </AlertDialog.Footer>
 *     </AlertDialog.Body>
 *   </AlertDialog.Content>
 * </AlertDialog.Root>
 * ```
 */
const Footer = ({
	"data-slot": dataSlot,
	asChild = false,
	className,
	ref,
	...props
}: ComponentProps<"div"> & WithAsChild & WithDataSlot) => {
	const Component = asChild ? Slot : "div";

	return (
		<Component
			data-slot={joinDataSlot(dataSlot, "alert-dialog-footer")}
			className={cx("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)}
			ref={ref}
			{...props}
		/>
	);
};

/**
 * An accessible name to be announced when the dialog is opened.
 *
 * Alternatively, pass `aria-label` or `aria-labelledby` to
 * `AlertDialogContent` and exclude this component.
 *
 * @see https://mantle.ngrok.com/components/overlays/alert-dialog#alertdialogtitle
 *
 * @example
 * ```tsx
 * <AlertDialog.Root intent="danger">
 *   <AlertDialog.Trigger asChild>
 *     <Button type="button" appearance="outlined" intent="neutral">
 *       Show Danger Alert Dialog
 *     </Button>
 *   </AlertDialog.Trigger>
 *   <AlertDialog.Content>
 *     <AlertDialog.Icon />
 *     <AlertDialog.Body>
 *       <AlertDialog.Header>
 *         <AlertDialog.Title>
 *           Are you absolutely sure?
 *         </AlertDialog.Title>
 *         <AlertDialog.Description>
 *           Proident quis nisi tempor irure sunt ut minim occaecat mollit sunt.
 *         </AlertDialog.Description>
 *       </AlertDialog.Header>
 *       <AlertDialog.Footer>
 *         <AlertDialog.Cancel type="button">Cancel</AlertDialog.Cancel>
 *         <AlertDialog.Action type="button">
 *           Continue
 *         </AlertDialog.Action>
 *       </AlertDialog.Footer>
 *     </AlertDialog.Body>
 *   </AlertDialog.Content>
 * </AlertDialog.Root>
 * ```
 */
const Title = ({
	"data-slot": dataSlot,
	className,
	ref,
	...props
}: Omit<ComponentProps<typeof AlertDialogPrimitiveTitle>, "scope"> & WithDataSlot) => (
	<AlertDialogPrimitiveTitle
		scope={scope}
		ref={ref}
		data-slot={joinDataSlot(dataSlot, "alert-dialog-title")}
		className={cx("text-strong text-center text-lg font-medium sm:text-start", className)}
		{...props}
	/>
);

/**
 * An accessible description to be announced when the dialog is opened.
 * Renders as a `div` by default, but can be changed to any other element using
 * the `asChild` prop.
 *
 * Alternatively, pass `aria-describedby` to `AlertDialogContent` and
 * exclude this component.
 *
 * @see https://mantle.ngrok.com/components/overlays/alert-dialog#alertdialogdescription
 *
 * @example
 * ```tsx
 * <AlertDialog.Root intent="danger">
 *   <AlertDialog.Trigger asChild>
 *     <Button type="button" appearance="outlined" intent="neutral">
 *       Show Danger Alert Dialog
 *     </Button>
 *   </AlertDialog.Trigger>
 *   <AlertDialog.Content>
 *     <AlertDialog.Icon />
 *     <AlertDialog.Body>
 *       <AlertDialog.Header>
 *         <AlertDialog.Title>
 *           Are you absolutely sure?
 *         </AlertDialog.Title>
 *         <AlertDialog.Description>
 *           Proident quis nisi tempor irure sunt ut minim occaecat mollit sunt.
 *         </AlertDialog.Description>
 *       </AlertDialog.Header>
 *       <AlertDialog.Footer>
 *         <AlertDialog.Cancel type="button">Cancel</AlertDialog.Cancel>
 *         <AlertDialog.Action type="button">
 *           Continue
 *         </AlertDialog.Action>
 *       </AlertDialog.Footer>
 *     </AlertDialog.Body>
 *   </AlertDialog.Content>
 * </AlertDialog.Root>
 * ```
 */
const Description = ({
	"data-slot": dataSlot,
	className,
	ref,
	...props
}: Omit<ComponentProps<typeof AlertDialogPrimitiveDescription>, "scope"> & WithDataSlot) => (
	<AlertDialogPrimitiveDescription
		scope={scope}
		ref={ref}
		data-slot={joinDataSlot(dataSlot, "alert-dialog-description")}
		className={cx("text-body text-center text-sm font-normal sm:text-start", className)}
		{...props}
	/>
);

type AlertDialogActionProps = Omit<ButtonProps, "appearance" | "intent"> & {
	/**
	 * The visual style of the action button. Optional here: `AlertDialog.Action`
	 * defaults to `"filled"` so the confirming action carries the heaviest
	 * visual weight in the dialog.
	 *
	 * @default "filled"
	 */
	appearance?: ButtonAppearance;
	/**
	 * The tone of the action button. Optional here. When omitted,
	 * `AlertDialog.Action` derives the tone from the parent `AlertDialog.Root`'s
	 * `intent` (`"danger"` → `"danger"`, `"info"` → `"neutral"`). A passed
	 * value always wins over the context-derived tone.
	 */
	intent?: ButtonIntent;
} & WithDataSlot;

/**
 * Default `AlertDialog.Action` button tone for each `AlertDialog` intent.
 */
const actionIntentByDialogIntent = {
	danger: "danger",
	info: "neutral",
} as const satisfies Record<AlertDialogIntent, ButtonIntent>;

/**
 * A button that confirms the Alert Dialog action.
 * Defaults to `appearance="filled"`, with a tone derived from the parent
 * `AlertDialog.Root`'s intent: danger dialogs get a danger button, info dialogs
 * get a neutral one.
 * Does not close the alert dialog by default.
 *
 * These buttons should be distinguished visually from the AlertDialogCancel button.
 *
 * Composes around the mantle Button component.
 *
 * @see https://mantle.ngrok.com/components/overlays/alert-dialog#alertdialogaction
 *
 * @example
 * ```tsx
 * <AlertDialog.Root intent="danger">
 *   <AlertDialog.Trigger asChild>
 *     <Button type="button" appearance="outlined" intent="neutral">
 *       Show Danger Alert Dialog
 *     </Button>
 *   </AlertDialog.Trigger>
 *   <AlertDialog.Content>
 *     <AlertDialog.Icon />
 *     <AlertDialog.Body>
 *       <AlertDialog.Header>
 *         <AlertDialog.Title>
 *           Are you absolutely sure?
 *         </AlertDialog.Title>
 *         <AlertDialog.Description>
 *           Proident quis nisi tempor irure sunt ut minim occaecat mollit sunt.
 *         </AlertDialog.Description>
 *       </AlertDialog.Header>
 *       <AlertDialog.Footer>
 *         <AlertDialog.Cancel type="button">Cancel</AlertDialog.Cancel>
 *         <AlertDialog.Action type="button">
 *           Continue
 *         </AlertDialog.Action>
 *       </AlertDialog.Footer>
 *     </AlertDialog.Body>
 *   </AlertDialog.Content>
 * </AlertDialog.Root>
 * ```
 */
const Action = ({
	"data-slot": dataSlot,
	//,
	appearance = "filled",
	intent,
	ref,
	...props
}: AlertDialogActionProps) => {
	const ctx = useAlertDialogContext();
	const contextIntent = actionIntentByDialogIntent[ctx.intent];

	return (
		<Button
			//
			appearance={appearance}
			data-slot={joinDataSlot(dataSlot, "alert-dialog-action")}
			intent={intent ?? contextIntent}
			ref={ref}
			{...props}
		/>
	);
};

type AlertDialogCancelProps = Omit<ButtonProps, "appearance" | "intent"> & {
	/**
	 * The visual style of the cancel button. Optional here: `AlertDialog.Cancel`
	 * defaults to `"outlined"` so it visually de-emphasizes against
	 * `AlertDialog.Action`.
	 *
	 * @default "outlined"
	 */
	appearance?: ButtonAppearance;
	/**
	 * The tone of the cancel button. Optional here: `AlertDialog.Cancel`
	 * defaults to `"neutral"`, the workhorse tone for routine actions.
	 *
	 * @default "neutral"
	 */
	intent?: ButtonIntent;
} & WithDataSlot;

/**
 * A button that closes the dialog and cancels the action.
 * Defaults to `appearance="outlined"` and `intent="neutral"`.
 *
 * This button should be distinguished visually from AlertDialogAction buttons.
 *
 * Composes around the mantle Button component.
 *
 * @see https://mantle.ngrok.com/components/overlays/alert-dialog#alertdialogcancel
 *
 * @example
 * ```tsx
 * <AlertDialog.Root intent="danger">
 *   <AlertDialog.Trigger asChild>
 *     <Button type="button" appearance="outlined" intent="neutral">
 *       Show Danger Alert Dialog
 *     </Button>
 *   </AlertDialog.Trigger>
 *   <AlertDialog.Content>
 *     <AlertDialog.Icon />
 *     <AlertDialog.Body>
 *       <AlertDialog.Header>
 *         <AlertDialog.Title>
 *           Are you absolutely sure?
 *         </AlertDialog.Title>
 *         <AlertDialog.Description>
 *           Proident quis nisi tempor irure sunt ut minim occaecat mollit sunt.
 *         </AlertDialog.Description>
 *       </AlertDialog.Header>
 *       <AlertDialog.Footer>
 *         <AlertDialog.Cancel type="button">Cancel</AlertDialog.Cancel>
 *         <AlertDialog.Action type="button">
 *           Continue
 *         </AlertDialog.Action>
 *       </AlertDialog.Footer>
 *     </AlertDialog.Body>
 *   </AlertDialog.Content>
 * </AlertDialog.Root>
 * ```
 */
const Cancel = ({
	"data-slot": dataSlot,
	//,
	appearance = "outlined",
	className,
	intent = "neutral",
	ref,
	...props
}: AlertDialogCancelProps) => (
	<AlertDialogPrimitiveClose scope={scope} asChild>
		<Button
			appearance={appearance}
			data-slot={joinDataSlot(dataSlot, "alert-dialog-cancel")}
			className={cx("mt-2 sm:mt-0", className)}
			intent={intent}
			ref={ref}
			{...props}
		/>
	</AlertDialogPrimitiveClose>
);

type AlertDialogIconProps = Omit<SvgAttributes, "children"> & {
	svg?: ReactNode;
} & WithDataSlot;

/**
 * Default `AlertDialog.Icon` glyphs for each `AlertDialog` intent.
 */
const defaultIcons = {
	danger: <WarningIcon />,
	info: <InfoIcon />,
} as const satisfies Record<AlertDialogIntent, ReactNode>;

/**
 * Default `AlertDialog.Icon` text colors for each `AlertDialog` intent.
 */
const defaultIconColors = {
	danger: "text-danger-600",
	info: "text-accent-600",
} as const satisfies Record<AlertDialogIntent, string>;

/**
 * An icon that visually represents the intent of the AlertDialog.
 *
 * Defaults to a warning icon for danger intent and an info icon for info
 * intent with the appropriate color.
 *
 * Can be overridden with a custom icon using the `svg` prop.
 *
 * @see https://mantle.ngrok.com/components/overlays/alert-dialog#alertdialogicon
 *
 * @example
 * ```tsx
 * <AlertDialog.Root intent="danger">
 *   <AlertDialog.Trigger asChild>
 *     <Button type="button" appearance="outlined" intent="neutral">
 *       Show Danger Alert Dialog
 *     </Button>
 *   </AlertDialog.Trigger>
 *   <AlertDialog.Content>
 *     <AlertDialog.Icon />
 *     <AlertDialog.Body>
 *       <AlertDialog.Header>
 *         <AlertDialog.Title>
 *           Are you absolutely sure?
 *         </AlertDialog.Title>
 *         <AlertDialog.Description>
 *           Proident quis nisi tempor irure sunt ut minim occaecat mollit sunt.
 *         </AlertDialog.Description>
 *       </AlertDialog.Header>
 *       <AlertDialog.Footer>
 *         <AlertDialog.Cancel type="button">Cancel</AlertDialog.Cancel>
 *         <AlertDialog.Action type="button">
 *           Continue
 *         </AlertDialog.Action>
 *       </AlertDialog.Footer>
 *     </AlertDialog.Body>
 *   </AlertDialog.Content>
 * </AlertDialog.Root>
 * ```
 */
const Icon = ({ "data-slot": dataSlot, className, ref, svg, ...props }: AlertDialogIconProps) => {
	const ctx = useAlertDialogContext();
	const defaultColor = defaultIconColors[ctx.intent];
	const defaultIcon = defaultIcons[ctx.intent];

	return (
		<SvgOnly
			ref={ref}
			data-slot={joinDataSlot(dataSlot, "alert-dialog-icon")}
			className={cx("size-12 sm:size-7", defaultColor, className)}
			svg={svg ?? defaultIcon}
			{...props}
		/>
	);
};

/**
 * A button that closes the Alert Dialog. (Unstyled)
 *
 * `AlertDialog.Cancel` already closes the dialog by default. Reach for
 * `AlertDialog.Close` when you need to attach close behavior to a custom
 * element (typically wrapping `AlertDialog.Action` with `asChild` so the
 * action both runs the operation and dismisses the dialog).
 *
 * @see https://mantle.ngrok.com/components/overlays/alert-dialog#alertdialogclose
 *
 * @example
 * ```tsx
 * <AlertDialog.Root intent="danger">
 *   <AlertDialog.Trigger asChild>
 *     <Button type="button" appearance="outlined" intent="neutral">
 *       Show Danger Alert Dialog
 *     </Button>
 *   </AlertDialog.Trigger>
 *   <AlertDialog.Content>
 *     <AlertDialog.Icon />
 *     <AlertDialog.Body>
 *       <AlertDialog.Header>
 *         <AlertDialog.Title>
 *           Are you absolutely sure?
 *         </AlertDialog.Title>
 *         <AlertDialog.Description>
 *           Proident quis nisi tempor irure sunt ut minim occaecat mollit sunt.
 *         </AlertDialog.Description>
 *       </AlertDialog.Header>
 *       <AlertDialog.Footer>
 *         <AlertDialog.Cancel type="button">Cancel</AlertDialog.Cancel>
 *         <AlertDialog.Close asChild>
 *           <AlertDialog.Action type="button" onClick={() => doThing()}>
 *             Do thing and close
 *           </AlertDialog.Action>
 *         </AlertDialog.Close>
 *       </AlertDialog.Footer>
 *     </AlertDialog.Body>
 *   </AlertDialog.Content>
 * </AlertDialog.Root>
 * ```
 */
const Close = ({
	"data-slot": dataSlot,
	ref,
	...props
}: Omit<ComponentProps<typeof AlertDialogPrimitiveClose>, "scope"> & WithDataSlot) => (
	<AlertDialogPrimitiveClose
		scope={scope}
		ref={ref}
		data-slot={joinDataSlot(dataSlot, "alert-dialog-close")}
		{...props}
	/>
);

export {
	//,
	Root,
	Action,
	Body,
	Cancel,
	Close,
	Content,
	Description,
	Footer,
	Header,
	Icon,
	Title,
	Trigger,
};
