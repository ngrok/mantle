import type { ComponentProps } from "react";
import { cx } from "../../utils/cx/cx.js";
import type { WithDataSlot } from "../../utils/data-slot.js";
import { joinDataSlot } from "../../utils/data-slot.js";
import { LayerContainer } from "../../utils/layer-container/layer-container.js";
import {
	Close as DialogPrimitiveClose,
	Content as DialogPrimitiveContent,
	Description as DialogPrimitiveDescription,
	Overlay as DialogPrimitiveOverlay,
	Portal as DialogPrimitivePortal,
	Root as DialogPrimitiveRoot,
	Title as DialogPrimitiveTitle,
	Trigger as DialogPrimitiveTrigger,
} from "./primitive.js";
import {
	type CloseIconButtonProps,
	CloseIconButtonView,
	contentSurfaceClassName,
	descriptionClassName,
	type DialogLayoutProps,
	titleClassName,
	wrapperClassName,
} from "./presentation.js";

/**
 * A window overlaid on either the primary window or another dialog window.
 * The root stateful component for the Dialog.
 *
 * `Dialog` renders its floating layer at Tailwind `z-60`, Mantle's overlay
 * tier, above every float (`z-50`). Floats composed inside the content portal
 * into the positioner (`data-slot="dialog-positioner"`) and paint above the
 * content. When multiple overlays are open, the most recently mounted overlay
 * renders on top.
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
const Root = DialogPrimitiveRoot;

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
const Trigger = ({
	"data-slot": dataSlot,
	...props
}: ComponentProps<typeof DialogPrimitiveTrigger> & WithDataSlot) => (
	<DialogPrimitiveTrigger data-slot={joinDataSlot(dataSlot, "dialog-trigger")} {...props} />
);

/**
 * The portal container for the dialog. Renders the overlay and content into a
 * portal so the dialog escapes its parent's stacking context.
 *
 * Most consumers should not need to use this directly. `Dialog.Content`
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
const Portal = DialogPrimitivePortal;

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
const Close = ({
	"data-slot": dataSlot,
	...props
}: ComponentProps<typeof DialogPrimitiveClose> & WithDataSlot) => (
	<DialogPrimitiveClose data-slot={joinDataSlot(dataSlot, "dialog-close")} {...props} />
);

/**
 * The backdrop overlay for the dialog. Sits between the page and the dialog
 * content and applies a blur and dim effect.
 *
 * Most consumers should not need to use this directly. `Dialog.Content`
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
const Overlay = ({
	"data-slot": dataSlot,
	className,
	ref,
	...props
}: ComponentProps<typeof DialogPrimitiveOverlay> & WithDataSlot) => (
	<DialogPrimitiveOverlay
		ref={ref}
		data-slot={joinDataSlot(dataSlot, "dialog-overlay")}
		className={cx(
			"bg-overlay data-state-closed:animate-out data-state-closed:fade-out-0 data-state-open:animate-in data-state-open:fade-in-0 duration-200 ease-out-strong data-state-closed:duration-150 fixed inset-0 z-60 backdrop-blur-xs",
			className,
		)}
		{...props}
	/>
);

type ContentProps = ComponentProps<typeof DialogPrimitiveContent> &
	DialogLayoutProps &
	WithDataSlot;

/**
 * The container for the dialog content.
 * Renders on top of the overlay and is centered in the viewport.
 *
 * `Dialog.Content` renders its floating layer at Tailwind `z-60`, Mantle's
 * overlay tier, above every float (`z-50`). Floats composed inside the content
 * portal into the positioner (`data-slot="dialog-positioner"`) and paint above
 * the content. When multiple overlays are open, the most recently mounted
 * overlay renders on top.
 *
 * `appearance` decides how much of the viewport the dialog claims. `"centered"`
 * caps it at `preferredWidth`, `"full-page"` fills the 16px-inset box, and
 * `"full-bleed"` fills the whole viewport.
 *
 * | Data Attribute    | Value                                            | Description                                                          |
 * | ----------------- | ------------------------------------------------ | -------------------------------------------------------------------- |
 * | `data-appearance` | `"centered"` \| `"full-page"` \| `"full-bleed"`   | Reflects the resolved `appearance`.                                  |
 * | `data-state`      | `"open"` \| `"closed"`                           | Stamped by Radix; drives the open and close animation.               |
 *
 * UI that must take clicks above the open dialog, such as a consent banner,
 * carries the `overlay-prompt` class: a click inside it does not count as an
 * outside click. Add `pointer-events-auto` too, because the open dialog sets
 * `pointer-events: none` on `<body>`. mantle's `Toaster` does both.
 *
 * The class reaches pointer input only. The open dialog traps keyboard
 * focus and hides outside content from assistive technology. Put a control that
 * every user must reach inside the content.
 *
 * A script can show its own popup in a frame on `<body>`, above the dialog,
 * such as the 3-D Secure challenge of a payment script. While that frame is
 * on top at the center of the viewport, the dialog yields to the popup:
 *
 * - Focus that a script moves into the popup stays there.
 * - Escape moves focus into the popup and does not close the dialog.
 * - A click in the popup is not an outside click.
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
 *
 * @example
 * Full bleed, for content that needs the whole viewport:
 * ```tsx
 * <Dialog.Root>
 *   <Dialog.Trigger asChild>
 *     <Button type="button" appearance="filled" intent="neutral">Open Dialog</Button>
 *   </Dialog.Trigger>
 *   <Dialog.Content appearance="full-bleed">
 *     <Dialog.Header>
 *       <Dialog.Title>Request log</Dialog.Title>
 *       <Dialog.CloseIconButton />
 *     </Dialog.Header>
 *     <Dialog.Body>
 *       <p>This is the dialog content.</p>
 *     </Dialog.Body>
 *     <Dialog.Footer>
 *       <Dialog.Close asChild>
 *         <Button type="button" appearance="outlined" intent="neutral">Close</Button>
 *       </Dialog.Close>
 *     </Dialog.Footer>
 *   </Dialog.Content>
 * </Dialog.Root>
 * ```
 */
const Content = ({
	"data-slot": dataSlot,
	appearance = "centered",
	children,
	className,
	preferredWidth,
	ref,
	...props
}: ContentProps) => (
	<Portal>
		{/* Why the overlay stays at full bleed: the content opens at `zoom-in-95`,
		    so a sliver of viewport edge is uncovered for the length of the
		    animation and would otherwise show the raw page. */}
		<Overlay />
		{/* Why the positioner is the layer container: floats composed inside the
		    dialog portal into it, after the content, so they paint above the
		    content inside the dialog's own stacking context. It stays free of
		    transforms (the open animation lives on the content), so a portaled
		    float's `position: fixed` still resolves against the viewport. */}
		<LayerContainer
			data-slot="dialog-positioner"
			className={cx(
				"fixed z-60 flex items-center justify-center motion-safe:not-has-[>[data-mantle-modal-content][data-state=open]]:animate-exit-hold",
				wrapperClassName[appearance],
			)}
		>
			<DialogPrimitiveContent
				data-appearance={appearance}
				data-mantle-modal-content
				data-slot={joinDataSlot(dataSlot, "dialog-content")}
				className={cx(
					contentSurfaceClassName({ appearance, preferredWidth }),
					"duration-200 ease-out-strong data-state-closed:duration-150 motion-reduce:animate-none!",
					"data-state-closed:animate-out data-state-closed:fade-out-0 data-state-closed:zoom-out-95 data-state-open:animate-in data-state-open:fade-in-0 data-state-open:zoom-in-95",
					className,
				)}
				ref={ref}
				{...props}
			>
				{children}
			</DialogPrimitiveContent>
		</LayerContainer>
	</Portal>
);

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
const CloseIconButton = (props: CloseIconButtonProps) => (
	<DialogPrimitiveClose asChild>
		<CloseIconButtonView {...props} />
	</DialogPrimitiveClose>
);

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
const Title = ({
	"data-slot": dataSlot,
	className,
	ref,
	...props
}: ComponentProps<typeof DialogPrimitiveTitle> & WithDataSlot) => (
	<DialogPrimitiveTitle
		ref={ref}
		data-slot={joinDataSlot(dataSlot, "dialog-title")}
		className={cx(titleClassName, className)}
		{...props}
	/>
);

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
const Description = ({
	"data-slot": dataSlot,
	className,
	ref,
	...props
}: ComponentProps<typeof DialogPrimitiveDescription> & WithDataSlot) => (
	<DialogPrimitiveDescription
		ref={ref}
		data-slot={joinDataSlot(dataSlot, "dialog-description")}
		className={cx(descriptionClassName, className)}
		{...props}
	/>
);

export {
	//,
	Root,
	Close,
	CloseIconButton,
	Content,
	Description,
	Overlay,
	Portal,
	Title,
	Trigger,
};
