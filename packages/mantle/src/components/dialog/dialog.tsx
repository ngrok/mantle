import { XIcon } from "@phosphor-icons/react/X";
import type { ComponentProps, ComponentPropsWithoutRef, ComponentRef } from "react";
import { forwardRef } from "react";
import { cx } from "../../utils/cx/cx.js";
import {
	IconButton,
	type IconButtonAppearance,
	type IconButtonProps,
} from "../button/icon-button.js";
import type { ButtonIntent } from "../button/intents.js";
import * as DialogPrimitive from "./primitive.js";

/**
 * A window overlaid on either the primary window or another dialog window.
 * The root stateful component for the Dialog.
 *
 * `Dialog` renders its floating layer at Tailwind `z-50`, Mantle's shared
 * floating z-index. When multiple shared layers are open, the most recently
 * mounted layer renders on top.
 *
 * @see https://mantle.ngrok.com/components/overlays/dialog#dialogroot
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
const Root = DialogPrimitive.Root;
Root.displayName = "Dialog";

/**
 * A button that opens the dialog.
 *
 * @see https://mantle.ngrok.com/components/overlays/dialog#dialogtrigger
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
const Trigger = forwardRef<
	ComponentRef<typeof DialogPrimitive.Trigger>,
	ComponentPropsWithoutRef<typeof DialogPrimitive.Trigger>
>((props, ref) => <DialogPrimitive.Trigger ref={ref} data-slot="dialog-trigger" {...props} />);
Trigger.displayName = "DialogTrigger";

/**
 * The portal container for the dialog. Renders the overlay and content into a
 * portal so the dialog escapes its parent's stacking context.
 *
 * Most consumers should not need to use this directly — `Dialog.Content`
 * already wraps its children in a portal. Use this only when you need to
 * customize the portal target or render the overlay yourself.
 *
 * @see https://mantle.ngrok.com/components/overlays/dialog#api-reference
 *
 * @example
 * ```tsx
 * <Dialog.Root>
 *   <Dialog.Trigger asChild>
 *     <Button type="button" appearance="filled" intent="neutral">Open Dialog</Button>
 *   </Dialog.Trigger>
 *   <Dialog.Portal>
 *     <Dialog.Overlay />
 *     <Dialog.Content>
 *       <Dialog.Header>
 *         <Dialog.Title>Dialog Title</Dialog.Title>
 *         <Dialog.Description>This is an optional description.</Dialog.Description>
 *         <Dialog.CloseIconButton />
 *       </Dialog.Header>
 *       <Dialog.Body>
 *         <p>This is the dialog content.</p>
 *       </Dialog.Body>
 *       <Dialog.Footer>
 *         <Dialog.Close asChild>
 *           <Button type="button" appearance="outlined" intent="neutral">Cancel</Button>
 *         </Dialog.Close>
 *         <Button type="button" appearance="filled" intent="neutral">Save</Button>
 *       </Dialog.Footer>
 *     </Dialog.Content>
 *   </Dialog.Portal>
 * </Dialog.Root>
 * ```
 */
const Portal = DialogPrimitive.Portal;
Portal.displayName = "DialogPortal";

/**
 * A button that closes the dialog when clicked. Wrap an interactive element
 * with `asChild` to delegate the close behavior to your own button.
 *
 * @see https://mantle.ngrok.com/components/overlays/dialog#dialogclose
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
const Close = forwardRef<
	ComponentRef<typeof DialogPrimitive.Close>,
	ComponentPropsWithoutRef<typeof DialogPrimitive.Close>
>((props, ref) => <DialogPrimitive.Close ref={ref} data-slot="dialog-close" {...props} />);
Close.displayName = "DialogClose";

/**
 * The backdrop overlay for the dialog. Sits between the page and the dialog
 * content and applies a blur and dim effect.
 *
 * Most consumers should not need to use this directly — `Dialog.Content`
 * renders an overlay automatically. Use this only when composing a custom
 * `Dialog.Portal` tree.
 *
 * @see https://mantle.ngrok.com/components/overlays/dialog#api-reference
 *
 * @example
 * ```tsx
 * <Dialog.Root>
 *   <Dialog.Trigger asChild>
 *     <Button type="button" appearance="filled" intent="neutral">Open Dialog</Button>
 *   </Dialog.Trigger>
 *   <Dialog.Portal>
 *     <Dialog.Overlay />
 *     <Dialog.Content>
 *       <Dialog.Header>
 *         <Dialog.Title>Dialog Title</Dialog.Title>
 *         <Dialog.Description>This is an optional description.</Dialog.Description>
 *         <Dialog.CloseIconButton />
 *       </Dialog.Header>
 *       <Dialog.Body>
 *         <p>This is the dialog content.</p>
 *       </Dialog.Body>
 *       <Dialog.Footer>
 *         <Dialog.Close asChild>
 *           <Button type="button" appearance="outlined" intent="neutral">Cancel</Button>
 *         </Dialog.Close>
 *         <Button type="button" appearance="filled" intent="neutral">Save</Button>
 *       </Dialog.Footer>
 *     </Dialog.Content>
 *   </Dialog.Portal>
 * </Dialog.Root>
 * ```
 */
const Overlay = forwardRef<
	ComponentRef<"div">,
	ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
	<DialogPrimitive.Overlay
		ref={ref}
		data-slot="dialog-overlay"
		className={cx(
			"bg-overlay data-state-closed:animate-out data-state-closed:fade-out-0 data-state-open:animate-in data-state-open:fade-in-0 fixed inset-0 z-50 backdrop-blur-xs",
			className,
		)}
		{...props}
	/>
));
Overlay.displayName = "DialogOverlay";

type ContentProps = ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
	/**
	 * The preferred width of the `Dialog.Content` as a tailwind `max-w-` class.
	 *
	 * By default, a `Dialog`'s content width is responsive with a default
	 * preferred width: the maximum width of the `Dialog.Content`
	 *
	 * @default `max-w-lg`
	 */
	preferredWidth?: `max-w-${string}`;
};

/**
 * The container for the dialog content.
 * Renders on top of the overlay and is centered in the viewport.
 *
 * `Dialog.Content` renders its floating layer at Tailwind `z-50`, Mantle's
 * shared floating z-index. When multiple shared layers are open, the most
 * recently mounted layer renders on top.
 *
 * @see https://mantle.ngrok.com/components/overlays/dialog#dialogcontent
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
const Content = forwardRef<ComponentRef<"div">, ContentProps>(
	({ children, className, preferredWidth = "max-w-lg", ...props }, ref) => (
		<Portal>
			<Overlay />
			<div className="fixed inset-4 z-50 flex items-center justify-center">
				<DialogPrimitive.Content
					data-mantle-modal-content
					data-slot="dialog-content"
					className={cx(
						"flex max-h-full w-full flex-1 flex-col",
						"outline-hidden focus-within:outline-hidden",
						"border-dialog bg-dialog rounded-xl border shadow-lg transition-transform duration-200",
						"data-state-closed:animate-out data-state-closed:fade-out-0 data-state-closed:zoom-out-95 data-state-open:animate-in data-state-open:fade-in-0 data-state-open:zoom-in-95",
						preferredWidth,
						className,
					)}
					ref={ref}
					{...props}
				>
					{children}
				</DialogPrimitive.Content>
			</div>
		</Portal>
	),
);
Content.displayName = "DialogContent";

/**
 * Contains the header content of the dialog, including the title and close button.
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
const Header = ({ className, children, ...props }: ComponentProps<"div">) => (
	<div
		data-slot="dialog-header"
		className={cx(
			"border-dialog-muted text-strong relative flex shrink-0 items-center justify-between gap-2 border-b px-6 py-4",
			"has-[.icon-button]:pr-4", // when there are actions in the header, shorten the padding
			className,
		)}
		{...props}
	>
		{children}
	</div>
);
Header.displayName = "DialogHeader";

type CloseIconButtonProps = Partial<Omit<IconButtonProps, "appearance" | "icon" | "intent">> & {
	/**
	 * The visual style of the close icon button. Optional here —
	 * `Dialog.CloseIconButton` defaults to `"ghost"` so the close affordance
	 * stays visually quiet in the dialog header.
	 *
	 * @default "ghost"
	 */
	appearance?: IconButtonAppearance;
	/**
	 * The tone of the close icon button. Optional here —
	 * `Dialog.CloseIconButton` defaults to `"neutral"`, the workhorse tone for
	 * routine actions like dismissing a dialog.
	 *
	 * @default "neutral"
	 */
	intent?: ButtonIntent;
};

/**
 * An icon button that closes the dialog when clicked.
 *
 * @see https://mantle.ngrok.com/components/overlays/dialog#dialogcloseiconbutton
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
const CloseIconButton = ({
	size = "md",
	type = "button",
	label = "Close Dialog",
	appearance = "ghost",
	intent = "neutral",
	...props
}: CloseIconButtonProps) => (
	<DialogPrimitive.Close asChild>
		<IconButton
			appearance={appearance}
			data-slot="dialog-close-icon-button"
			icon={<XIcon />}
			intent={intent}
			label={label}
			size={size}
			type={type}
			{...props}
		/>
	</DialogPrimitive.Close>
);
CloseIconButton.displayName = "DialogCloseIconButton";

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
const Body = ({ className, ...props }: ComponentProps<"div">) => (
	<div
		data-slot="dialog-body"
		className={cx(
			"scrollbar scrollbar-gutter-stable text-body flex-1 overflow-y-auto p-6",
			className,
		)}
		{...props}
	/>
);
Body.displayName = "DialogBody";

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
const Footer = ({ className, ...props }: ComponentProps<"div">) => (
	<div
		data-slot="dialog-footer"
		className={cx(
			"border-dialog-muted flex shrink-0 justify-end gap-2 border-t px-6 py-4",
			className,
		)}
		{...props}
	/>
);
Footer.displayName = "DialogFooter";

/**
 * An accessible name to be announced when the dialog is opened.
 *
 * @see https://mantle.ngrok.com/components/overlays/dialog#dialogtitle
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
const Title = forwardRef<
	ComponentRef<typeof DialogPrimitive.Title>,
	ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
	<DialogPrimitive.Title
		ref={ref}
		data-slot="dialog-title"
		className={cx("text-strong truncate text-lg font-medium", className)}
		{...props}
	/>
));
Title.displayName = "DialogTitle";

/**
 * An accessible description to be announced when the dialog is opened.
 * Renders as a `div` by default, but can be changed to any other element using
 * the `asChild` prop.
 *
 * @see https://mantle.ngrok.com/components/overlays/dialog#dialogdescription
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
const Description = forwardRef<
	ComponentRef<typeof DialogPrimitive.Description>,
	ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
	<DialogPrimitive.Description
		ref={ref}
		data-slot="dialog-description"
		className={cx("text-muted", className)}
		{...props}
	/>
));
Description.displayName = "DialogDescription";

/**
 * A window overlaid on either the primary window or another dialog window. Use
 * Dialog for a focused modal that interrupts the user to gather input or
 * confirm a non-destructive choice. For destructive or irreversible
 * confirmations (delete, sign out, leave without saving), prefer `AlertDialog`.
 * For side-panel content that slides in from an edge (filter panels, detail
 * views, navigation drawers), prefer `Sheet`.
 *
 * `Dialog` renders its floating layer at Tailwind `z-50`, Mantle's shared
 * floating z-index. When multiple shared layers are open, the most recently
 * mounted layer renders on top.
 *
 * @see https://mantle.ngrok.com/components/overlays/dialog
 *
 * @example
 * Composition:
 * ```
 * Dialog.Root
 * ├── Dialog.Trigger
 * └── Dialog.Content
 *     ├── Dialog.Header
 *     │   ├── Dialog.Title
 *     │   ├── Dialog.Description
 *     │   └── Dialog.CloseIconButton
 *     ├── Dialog.Body
 *     └── Dialog.Footer
 *         └── Dialog.Close
 * ```
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
const Dialog = {
	/**
	 * A window overlaid on either the primary window or another dialog window.
	 * The root stateful component for the Dialog.
	 *
	 * `Dialog` renders its floating layer at Tailwind `z-50`, Mantle's shared
	 * floating z-index. When multiple shared layers are open, the most recently
	 * mounted layer renders on top.
	 *
	 * @see https://mantle.ngrok.com/components/overlays/dialog#dialogroot
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
	Root,
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
	Body,
	/**
	 * A button that closes the dialog when clicked.
	 *
	 * @see https://mantle.ngrok.com/components/overlays/dialog#dialogclose
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
	Close,
	/**
	 * An icon button that closes the dialog when clicked.
	 *
	 * @see https://mantle.ngrok.com/components/overlays/dialog#dialogcloseiconbutton
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
	CloseIconButton,
	/**
	 * The container for the dialog content.
	 * Renders on top of the overlay and is centered in the viewport.
	 *
	 * `Dialog.Content` renders its floating layer at Tailwind `z-50`, Mantle's
	 * shared floating z-index. When multiple shared layers are open, the most
	 * recently mounted layer renders on top.
	 *
	 * @see https://mantle.ngrok.com/components/overlays/dialog#dialogcontent
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
	Content,
	/**
	 * An accessible description to be announced when the dialog is opened.
	 *
	 * @see https://mantle.ngrok.com/components/overlays/dialog#dialogdescription
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
	Description,
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
	Footer,
	/**
	 * Contains the header content of the dialog, including the title and close button.
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
	Header,
	/**
	 * The overlay backdrop for the dialog.
	 *
	 * @see https://mantle.ngrok.com/components/overlays/dialog#api-reference
	 *
	 * @example
	 * ```tsx
	 * <Dialog.Root>
	 *   <Dialog.Trigger asChild>
	 *     <Button type="button" appearance="filled" intent="neutral">Open Dialog</Button>
	 *   </Dialog.Trigger>
	 *   <Dialog.Portal>
	 *     <Dialog.Overlay />
	 *     <Dialog.Content>
	 *       <Dialog.Header>
	 *         <Dialog.Title>Dialog Title</Dialog.Title>
	 *         <Dialog.Description>This is an optional description.</Dialog.Description>
	 *         <Dialog.CloseIconButton />
	 *       </Dialog.Header>
	 *       <Dialog.Body>
	 *         <p>This is the dialog content.</p>
	 *       </Dialog.Body>
	 *       <Dialog.Footer>
	 *         <Dialog.Close asChild>
	 *           <Button type="button" appearance="outlined" intent="neutral">Cancel</Button>
	 *         </Dialog.Close>
	 *         <Button type="button" appearance="filled" intent="neutral">Save</Button>
	 *       </Dialog.Footer>
	 *     </Dialog.Content>
	 *   </Dialog.Portal>
	 * </Dialog.Root>
	 * ```
	 */
	Overlay,
	/**
	 * The portal container for the dialog.
	 *
	 * @see https://mantle.ngrok.com/components/overlays/dialog#api-reference
	 *
	 * @example
	 * ```tsx
	 * <Dialog.Root>
	 *   <Dialog.Trigger asChild>
	 *     <Button type="button" appearance="filled" intent="neutral">Open Dialog</Button>
	 *   </Dialog.Trigger>
	 *   <Dialog.Portal>
	 *     <Dialog.Overlay />
	 *     <Dialog.Content>
	 *       <Dialog.Header>
	 *         <Dialog.Title>Dialog Title</Dialog.Title>
	 *         <Dialog.Description>This is an optional description.</Dialog.Description>
	 *         <Dialog.CloseIconButton />
	 *       </Dialog.Header>
	 *       <Dialog.Body>
	 *         <p>This is the dialog content.</p>
	 *       </Dialog.Body>
	 *       <Dialog.Footer>
	 *         <Dialog.Close asChild>
	 *           <Button type="button" appearance="outlined" intent="neutral">Cancel</Button>
	 *         </Dialog.Close>
	 *         <Button type="button" appearance="filled" intent="neutral">Save</Button>
	 *       </Dialog.Footer>
	 *     </Dialog.Content>
	 *   </Dialog.Portal>
	 * </Dialog.Root>
	 * ```
	 */
	Portal,
	/**
	 * An accessible name to be announced when the dialog is opened.
	 *
	 * @see https://mantle.ngrok.com/components/overlays/dialog#dialogtitle
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
	Title,
	/**
	 * A button that opens the dialog.
	 *
	 * @see https://mantle.ngrok.com/components/overlays/dialog#dialogtrigger
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
	Trigger,
} as const;

export {
	//,
	Dialog,
};
