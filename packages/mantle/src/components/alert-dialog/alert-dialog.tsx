"use client";

import { InfoIcon } from "@phosphor-icons/react/Info";
import { WarningIcon } from "@phosphor-icons/react/Warning";
import {
	type ComponentProps,
	type ComponentPropsWithoutRef,
	type ComponentRef,
	type ReactNode,
	createContext,
	forwardRef,
	useContext,
	useMemo,
} from "react";
import invariant from "tiny-invariant";
import type { WithAsChild } from "../../types/as-child.js";
import { cx } from "../../utils/cx/cx.js";
import { Button, type ButtonAppearance, type ButtonProps } from "../button/button.js";
import type { ButtonIntent } from "../button/intents.js";
import * as AlertDialogPrimitive from "../dialog/primitive.js";
import { SvgOnly } from "../icon/svg-only.js";
import type { SvgAttributes } from "../icon/types.js";
import { Slot } from "../slot/index.js";

const intents = ["info", "danger"] as const;
type AlertDialogIntent = (typeof intents)[number];

type AlertDialogContextValue = {
	intent: AlertDialogIntent;
};

const AlertDialogContext = createContext<AlertDialogContextValue | null>(null);

function useAlertDialogContext() {
	const context = useContext(AlertDialogContext);
	invariant(context, "AlertDialog child component used outside of AlertDialog parent!");
	return context;
}

type AlertDialogProps = ComponentProps<typeof AlertDialogPrimitive.Root> & {
	/**
	 * The intent of the AlertDialog — the tone its color communicates to the
	 * user, affecting the color and styling of descendants like
	 * `AlertDialog.Icon` and `AlertDialog.Action`.
	 */
	intent: AlertDialogIntent;
};

/**
 * A modal dialog that interrupts the user with important content and expects a
 * response.
 * The root stateful component for the Alert Dialog.
 *
 * `AlertDialog` renders its floating layer at Tailwind `z-50`, Mantle's
 * shared floating z-index. When multiple shared layers are open, the most
 * recently mounted layer renders on top.
 *
 * @see https://mantle.ngrok.com/components/overlays/alert-dialog#alertdialogroot
 *
 * @example
 * ```tsx
 * <AlertDialog.Root intent="danger">
 *   <AlertDialog.Trigger asChild>
 *     <Button type="button" appearance="outlined" intent="accent">
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
			<AlertDialogPrimitive.Root {...props} />
		</AlertDialogContext.Provider>
	);
}
Root.displayName = "AlertDialog";

/**
 * A button that opens the Alert Dialog.
 *
 * @see https://mantle.ngrok.com/components/overlays/alert-dialog#alertdialogtrigger
 *
 * @example
 * ```tsx
 * <AlertDialog.Root intent="danger">
 *   <AlertDialog.Trigger asChild>
 *     <Button type="button" appearance="outlined" intent="accent">
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
const Trigger = forwardRef<
	ComponentRef<typeof AlertDialogPrimitive.Trigger>,
	ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Trigger>
>(({ ...props }, ref) => (
	<AlertDialogPrimitive.Trigger ref={ref} data-slot="alert-dialog-trigger" {...props} />
));
Trigger.displayName = "AlertDialogTrigger";

/**
 * The portal for the Alert Dialog.
 *
 * @private
 */
const AlertDialogPortal = AlertDialogPrimitive.Portal;
AlertDialogPortal.displayName = "AlertDialogPortal";

/**
 * A layer that covers the inert portion of the view when the dialog is open.
 *
 * @private
 */
const AlertDialogOverlay = forwardRef<
	ComponentRef<typeof AlertDialogPrimitive.Overlay>,
	ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
	<AlertDialogPrimitive.Overlay
		data-slot="alert-dialog-overlay"
		className={cx(
			"data-state-open:animate-in data-state-closed:animate-out data-state-closed:fade-out-0 data-state-open:fade-in-0 bg-overlay fixed inset-0 z-50 backdrop-blur-xs",
			className,
		)}
		{...props}
		ref={ref}
	/>
));
AlertDialogOverlay.displayName = "AlertDialogOverlay";

type AlertDialogContentProps = ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content> & {
	/**
	 * The preferred width of the `AlertDialogContent` as a tailwind `max-w-` class.
	 *
	 * By default, a `AlertDialog`'s content width is responsive with a default
	 * preferred width: the maximum width of the `AlertDialogContent`
	 *
	 * @default `max-w-md`
	 */
	preferredWidth?: `max-w-${string}`;
};

/**
 * The popover alert dialog container.
 *
 * Renders on top of the overlay and is centered in the viewport.
 *
 * `AlertDialog.Content` renders its floating layer at Tailwind `z-50`,
 * Mantle's shared floating z-index. When multiple shared layers are open, the
 * most recently mounted layer renders on top.
 *
 * @see https://mantle.ngrok.com/components/overlays/alert-dialog#alertdialogcontent
 *
 * @example
 * ```tsx
 * <AlertDialog.Root intent="danger">
 *   <AlertDialog.Trigger asChild>
 *     <Button type="button" appearance="outlined" intent="accent">
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
const Content = forwardRef<
	ComponentRef<typeof AlertDialogPrimitive.Content>,
	AlertDialogContentProps
>(({ className, preferredWidth = "max-w-md", ...props }, ref) => (
	<AlertDialogPortal>
		<AlertDialogOverlay />
		<div className="fixed inset-4 z-50 flex items-center justify-center">
			<AlertDialogPrimitive.Content
				data-slot="alert-dialog-content"
				data-mantle-modal-content
				ref={ref}
				className={cx(
					"flex w-full flex-1 flex-col items-center gap-4 sm:flex-row sm:items-start",
					"outline-hidden focus-within:outline-hidden",
					"p-6",
					"border-dialog bg-dialog rounded-xl border shadow-lg transition-transform duration-200",
					"data-state-closed:animate-out data-state-closed:fade-out-0 data-state-closed:zoom-out-95 data-state-open:animate-in data-state-open:fade-in-0 data-state-open:zoom-in-95",
					preferredWidth,
					className,
				)}
				{...props}
			/>
		</div>
	</AlertDialogPortal>
));
Content.displayName = "AlertDialogContent";

/**
 * Contains the main content of the alert dialog.
 *
 * @see https://mantle.ngrok.com/components/overlays/alert-dialog#alertdialogbody
 *
 * @example
 * ```tsx
 * <AlertDialog.Root intent="danger">
 *   <AlertDialog.Trigger asChild>
 *     <Button type="button" appearance="outlined" intent="accent">
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
const Body = forwardRef<ComponentRef<"div">, ComponentProps<"div"> & WithAsChild>(
	({ asChild = false, className, ...props }, ref) => {
		const Component = asChild ? Slot : "div";

		return (
			<Component
				data-slot="alert-dialog-body"
				className={cx("flex-1 space-y-4", className)}
				ref={ref}
				{...props}
			/>
		);
	},
);
Body.displayName = "AlertDialogBody";

/**
 * Contains the header content of the dialog, including the title and description.
 *
 * @see https://mantle.ngrok.com/components/overlays/alert-dialog#alertdialogheader
 *
 * @example
 * ```tsx
 * <AlertDialog.Root intent="danger">
 *   <AlertDialog.Trigger asChild>
 *     <Button type="button" appearance="outlined" intent="accent">
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
const Header = forwardRef<ComponentRef<"div">, ComponentProps<"div"> & WithAsChild>(
	({ asChild = false, className, ...props }, ref) => {
		const Component = asChild ? Slot : "div";

		return (
			<Component
				data-slot="alert-dialog-header"
				className={cx("flex flex-col space-y-2 text-center sm:text-start", className)}
				ref={ref}
				{...props}
			/>
		);
	},
);
Header.displayName = "AlertDialogHeader";

/**
 * Contains the footer content of the dialog, including the action and cancel buttons.
 *
 * @see https://mantle.ngrok.com/components/overlays/alert-dialog#alertdialogfooter
 *
 * @example
 * ```tsx
 * <AlertDialog.Root intent="danger">
 *   <AlertDialog.Trigger asChild>
 *     <Button type="button" appearance="outlined" intent="accent">
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
const Footer = forwardRef<ComponentRef<"div">, ComponentProps<"div"> & WithAsChild>(
	({ asChild = false, className, ...props }, ref) => {
		const Component = asChild ? Slot : "div";

		return (
			<Component
				data-slot="alert-dialog-footer"
				className={cx("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)}
				ref={ref}
				{...props}
			/>
		);
	},
);
Footer.displayName = "AlertDialogFooter";

/**
 * An accessible name to be announced when the dialog is opened.
 *
 * Alternatively, you can provide `aria-label` or `aria-labelledby` to
 * `AlertDialogContent` and exclude this component.
 *
 * @see https://mantle.ngrok.com/components/overlays/alert-dialog#alertdialogtitle
 *
 * @example
 * ```tsx
 * <AlertDialog.Root intent="danger">
 *   <AlertDialog.Trigger asChild>
 *     <Button type="button" appearance="outlined" intent="accent">
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
const Title = forwardRef<
	ComponentRef<typeof AlertDialogPrimitive.Title>,
	ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title>
>(({ className, ...props }, ref) => (
	<AlertDialogPrimitive.Title
		ref={ref}
		data-slot="alert-dialog-title"
		className={cx("text-strong text-center text-lg font-medium sm:text-start", className)}
		{...props}
	/>
));
Title.displayName = "AlertDialogTitle";

/**
 * An accessible description to be announced when the dialog is opened.
 * Renders as a `div` by default, but can be changed to any other element using
 * the `asChild` prop.
 *
 * Alternatively, you can provide `aria-describedby` to `AlertDialogContent` and
 * exclude this component.
 *
 * @see https://mantle.ngrok.com/components/overlays/alert-dialog#alertdialogdescription
 *
 * @example
 * ```tsx
 * <AlertDialog.Root intent="danger">
 *   <AlertDialog.Trigger asChild>
 *     <Button type="button" appearance="outlined" intent="accent">
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
const Description = forwardRef<
	ComponentRef<typeof AlertDialogPrimitive.Description>,
	ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description>
>(({ className, ...props }, ref) => (
	<AlertDialogPrimitive.Description
		ref={ref}
		data-slot="alert-dialog-description"
		className={cx("text-body text-center text-sm font-normal sm:text-start", className)}
		{...props}
	/>
));
Description.displayName = "AlertDialogDescription";

type AlertDialogActionProps = Omit<ButtonProps, "appearance" | "intent"> & {
	/**
	 * The visual style of the action button. Optional here — `AlertDialog.Action`
	 * defaults to `"filled"` so the confirming action carries the heaviest
	 * visual weight in the dialog.
	 *
	 * @default "filled"
	 */
	appearance?: ButtonAppearance;
	/**
	 * The tone of the action button. Optional here — when omitted,
	 * `AlertDialog.Action` derives the tone from the parent `AlertDialog.Root`'s
	 * `intent` (`"danger"` → `"danger"`, otherwise `"accent"`). A passed value
	 * always wins over the context-derived tone.
	 */
	intent?: ButtonIntent;
};

/**
 * A button that confirms the Alert Dialog action.
 * Will default to appearance="filled", as well as the intent color from the `AlertDialog`.
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
 *     <Button type="button" appearance="outlined" intent="accent">
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
const Action = forwardRef<ComponentRef<"button">, AlertDialogActionProps>(
	(
		{
			//,
			appearance = "filled",
			intent,
			...props
		},
		ref,
	) => {
		const ctx = useAlertDialogContext();
		const contextIntent: ButtonIntent = ctx.intent === "danger" ? "danger" : "accent";

		return (
			<Button
				//
				appearance={appearance}
				data-slot="alert-dialog-action"
				intent={intent ?? contextIntent}
				ref={ref}
				{...props}
			/>
		);
	},
);
Action.displayName = "AlertDialogAction";

type AlertDialogCancelProps = Omit<ButtonProps, "appearance" | "intent"> & {
	/**
	 * The visual style of the cancel button. Optional here — `AlertDialog.Cancel`
	 * defaults to `"outlined"` so it visually de-emphasizes against
	 * `AlertDialog.Action`.
	 *
	 * @default "outlined"
	 */
	appearance?: ButtonAppearance;
	/**
	 * The tone of the cancel button. Optional here — `AlertDialog.Cancel`
	 * defaults to `"neutral"`, the workhorse tone for routine actions.
	 *
	 * @default "neutral"
	 */
	intent?: ButtonIntent;
};

/**
 * A button that closes the dialog and cancels the action.
 * Will default to appearance="outlined" and intent="neutral".
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
 *     <Button type="button" appearance="outlined" intent="accent">
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
const Cancel = forwardRef<ComponentRef<"button">, AlertDialogCancelProps>(
	(
		{
			//,
			appearance = "outlined",
			className,
			intent = "neutral",
			...props
		},
		ref,
	) => (
		<AlertDialogPrimitive.Close asChild>
			<Button
				appearance={appearance}
				data-slot="alert-dialog-cancel"
				className={cx("mt-2 sm:mt-0", className)}
				intent={intent}
				ref={ref}
				{...props}
			/>
		</AlertDialogPrimitive.Close>
	),
);
Cancel.displayName = "AlertDialogCancel";

type AlertDialogIconProps = Omit<SvgAttributes, "children"> & {
	svg?: ReactNode;
};

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
 *     <Button type="button" appearance="outlined" intent="accent">
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
const Icon = forwardRef<ComponentRef<"svg">, AlertDialogIconProps>(
	({ className, svg, ...props }, ref) => {
		const ctx = useAlertDialogContext();
		const defaultColor = ctx.intent === "danger" ? "text-danger-600" : "text-accent-600";
		const defaultIcon = ctx.intent === "danger" ? <WarningIcon /> : <InfoIcon />;

		return (
			<SvgOnly
				ref={ref}
				data-slot="alert-dialog-icon"
				className={cx("size-12 sm:size-7", defaultColor, className)}
				svg={svg ?? defaultIcon}
				{...props}
			/>
		);
	},
);
Icon.displayName = "AlertDialogIcon";

/**
 * A button that closes the Alert Dialog. (Unstyled)
 *
 * `AlertDialog.Cancel` already closes the dialog by default. Reach for
 * `AlertDialog.Close` when you need to attach close behavior to a custom
 * element (typically wrapping `AlertDialog.Action` with `asChild` so the
 * action both performs the operation and dismisses the dialog).
 *
 * @see https://mantle.ngrok.com/components/overlays/alert-dialog#alertdialogclose
 *
 * @example
 * ```tsx
 * <AlertDialog.Root intent="danger">
 *   <AlertDialog.Trigger asChild>
 *     <Button type="button" appearance="outlined" intent="accent">
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
const Close = forwardRef<
	ComponentRef<typeof AlertDialogPrimitive.Close>,
	ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Close>
>(({ ...props }, ref) => (
	<AlertDialogPrimitive.Close ref={ref} data-slot="alert-dialog-close" {...props} />
));
Close.displayName = "AlertDialogClose";

/**
 * A modal dialog that interrupts the user with important content and expects a
 * response. Use AlertDialog for destructive or irreversible confirmations
 * (delete, sign out, leave without saving) where the user must explicitly
 * acknowledge before proceeding — it blocks all background interaction by
 * default. For non-destructive input modals or confirmation flows, use
 * `Dialog` instead. For side-panel content (filter panels, detail views,
 * navigation drawers), use `Sheet`.
 *
 * `AlertDialog` renders its floating layer at Tailwind `z-50`, Mantle's
 * shared floating z-index. When multiple shared layers are open, the most
 * recently mounted layer renders on top.
 *
 * @see https://mantle.ngrok.com/components/overlays/alert-dialog
 *
 * @example
 * Composition:
 * ```
 * AlertDialog.Root
 * ├── AlertDialog.Trigger
 * └── AlertDialog.Content
 *     ├── AlertDialog.Icon
 *     └── AlertDialog.Body
 *         ├── AlertDialog.Header
 *         │   ├── AlertDialog.Title
 *         │   └── AlertDialog.Description
 *         └── AlertDialog.Footer
 *             ├── AlertDialog.Cancel
 *             └── AlertDialog.Action
 * ```
 *
 * @example
 * ```tsx
 * <AlertDialog.Root intent="danger">
 *   <AlertDialog.Trigger asChild>
 *     <Button type="button" appearance="outlined" intent="accent">
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
const AlertDialog = {
	/**
	 * The root stateful component for the Alert Dialog. Wraps the trigger and
	 * content and exposes the required `intent` prop (`"danger"` for
	 * destructive actions, `"info"` for informational confirmations) — the tone
	 * its color communicates — which propagates color to descendants like
	 * `AlertDialog.Icon` and `AlertDialog.Action`.
	 *
	 * `AlertDialog` renders its floating layer at Tailwind `z-50`, Mantle's
	 * shared floating z-index. When multiple shared layers are open, the most
	 * recently mounted layer renders on top.
	 *
	 * @see https://mantle.ngrok.com/components/overlays/alert-dialog#alertdialogroot
	 *
	 * @example
	 * ```tsx
	 * <AlertDialog.Root intent="danger">
	 *   <AlertDialog.Trigger asChild>
	 *     <Button type="button" appearance="outlined" intent="accent">
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
	Root,
	/**
	 * A button that confirms the Alert Dialog action. Defaults to
	 * `appearance="filled"` and inherits the intent color from the parent
	 * `AlertDialog.Root`. Does not close the dialog by default — wrap with
	 * `AlertDialog.Close asChild` if the action should also dismiss.
	 *
	 * @see https://mantle.ngrok.com/components/overlays/alert-dialog#alertdialogaction
	 *
	 * @example
	 * ```tsx
	 * <AlertDialog.Root intent="danger">
	 *   <AlertDialog.Trigger asChild>
	 *     <Button type="button" appearance="outlined" intent="accent">
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
	Action,
	/**
	 * Contains the main content of the alert dialog. Wraps the header and footer
	 * inside `AlertDialog.Content` next to `AlertDialog.Icon`.
	 *
	 * @see https://mantle.ngrok.com/components/overlays/alert-dialog#alertdialogbody
	 *
	 * @example
	 * ```tsx
	 * <AlertDialog.Root intent="danger">
	 *   <AlertDialog.Trigger asChild>
	 *     <Button type="button" appearance="outlined" intent="accent">
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
	Body,
	/**
	 * A button that closes the dialog and cancels the action. Defaults to
	 * `appearance="outlined"` and `intent="neutral"` so it visually
	 * de-emphasizes against `AlertDialog.Action`.
	 *
	 * @see https://mantle.ngrok.com/components/overlays/alert-dialog#alertdialogcancel
	 *
	 * @example
	 * ```tsx
	 * <AlertDialog.Root intent="danger">
	 *   <AlertDialog.Trigger asChild>
	 *     <Button type="button" appearance="outlined" intent="accent">
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
	Cancel,
	/**
	 * A button that closes the Alert Dialog. (Unstyled) Typically wrapped
	 * around `AlertDialog.Action` with `asChild` so the action both performs
	 * the operation and dismisses the dialog.
	 *
	 * @see https://mantle.ngrok.com/components/overlays/alert-dialog#alertdialogclose
	 *
	 * @example
	 * ```tsx
	 * <AlertDialog.Root intent="danger">
	 *   <AlertDialog.Trigger asChild>
	 *     <Button type="button" appearance="outlined" intent="accent">
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
	Close,
	/**
	 * The popover alert dialog container. Renders on top of the overlay,
	 * centered in the viewport.
	 *
	 * `AlertDialog.Content` renders its floating layer at Tailwind `z-50`,
	 * Mantle's shared floating z-index. When multiple shared layers are open,
	 * the most recently mounted layer renders on top.
	 *
	 * @see https://mantle.ngrok.com/components/overlays/alert-dialog#alertdialogcontent
	 *
	 * @example
	 * ```tsx
	 * <AlertDialog.Root intent="danger">
	 *   <AlertDialog.Trigger asChild>
	 *     <Button type="button" appearance="outlined" intent="accent">
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
	Content,
	/**
	 * An accessible description to be announced when the dialog is opened.
	 * Renders as a `div` by default; can be changed via the `asChild` prop.
	 *
	 * @see https://mantle.ngrok.com/components/overlays/alert-dialog#alertdialogdescription
	 *
	 * @example
	 * ```tsx
	 * <AlertDialog.Root intent="danger">
	 *   <AlertDialog.Trigger asChild>
	 *     <Button type="button" appearance="outlined" intent="accent">
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
	Description,
	/**
	 * Contains the footer content of the dialog, including the action and
	 * cancel buttons.
	 *
	 * @see https://mantle.ngrok.com/components/overlays/alert-dialog#alertdialogfooter
	 *
	 * @example
	 * ```tsx
	 * <AlertDialog.Root intent="danger">
	 *   <AlertDialog.Trigger asChild>
	 *     <Button type="button" appearance="outlined" intent="accent">
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
	Footer,
	/**
	 * Contains the header content of the dialog, including the title and
	 * description.
	 *
	 * @see https://mantle.ngrok.com/components/overlays/alert-dialog#alertdialogheader
	 *
	 * @example
	 * ```tsx
	 * <AlertDialog.Root intent="danger">
	 *   <AlertDialog.Trigger asChild>
	 *     <Button type="button" appearance="outlined" intent="accent">
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
	Header,
	/**
	 * An icon that visually represents the intent of the AlertDialog.
	 * Defaults to a warning icon for `danger` and an info icon for `info`. Can
	 * be overridden via the `svg` prop.
	 *
	 * @see https://mantle.ngrok.com/components/overlays/alert-dialog#alertdialogicon
	 *
	 * @example
	 * ```tsx
	 * <AlertDialog.Root intent="danger">
	 *   <AlertDialog.Trigger asChild>
	 *     <Button type="button" appearance="outlined" intent="accent">
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
	Icon,
	/**
	 * An accessible name to be announced when the dialog is opened.
	 * Alternatively, provide `aria-label` or `aria-labelledby` to
	 * `AlertDialog.Content` and exclude this component.
	 *
	 * @see https://mantle.ngrok.com/components/overlays/alert-dialog#alertdialogtitle
	 *
	 * @example
	 * ```tsx
	 * <AlertDialog.Root intent="danger">
	 *   <AlertDialog.Trigger asChild>
	 *     <Button type="button" appearance="outlined" intent="accent">
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
	Title,
	/**
	 * A button that opens the Alert Dialog.
	 *
	 * @see https://mantle.ngrok.com/components/overlays/alert-dialog#alertdialogtrigger
	 *
	 * @example
	 * ```tsx
	 * <AlertDialog.Root intent="danger">
	 *   <AlertDialog.Trigger asChild>
	 *     <Button type="button" appearance="outlined" intent="accent">
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
	Trigger,
} as const;

export {
	//,
	AlertDialog,
};
