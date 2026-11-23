"use client";

import type { ComponentProps } from "react";
import { cx } from "../../utils/cx/cx.js";
import type { WithDataSlot } from "../../utils/data-slot.js";
import { joinDataSlot } from "../../utils/data-slot.js";
import {
	Close as DialogPrimitiveClose,
	Content as DialogPrimitiveContent,
	createScope,
	Description as DialogPrimitiveDescription,
	Overlay as DialogPrimitiveOverlay,
	Portal as DialogPrimitivePortal,
	Root as DialogPrimitiveRoot,
	type RootProps,
	Title as DialogPrimitiveTitle,
	Trigger as DialogPrimitiveTrigger,
} from "./native-primitive.js";
import {
	type CloseIconButtonProps,
	CloseIconButtonView,
	contentSurfaceClassName,
	descriptionClassName,
	type DialogLayoutProps,
	titleClassName,
	wrapperClassName,
} from "./presentation.js";

/** The scope that ties the `Dialog` parts to their `Root`. */
const scope = createScope();

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
const Root = (props: Omit<RootProps, "scope">) => <DialogPrimitiveRoot scope={scope} {...props} />;

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
}: Omit<ComponentProps<typeof DialogPrimitiveTrigger>, "scope"> & WithDataSlot) => (
	<DialogPrimitiveTrigger
		scope={scope}
		data-slot={joinDataSlot(dataSlot, "dialog-trigger")}
		{...props}
	/>
);

/**
 * Renders its children. `Dialog.Content` renders a `<dialog>` in the browser's
 * top layer, so it needs no portal, and `container` does nothing.
 *
 * @deprecated Render `Dialog.Content` in `Dialog.Root` directly.
 *
 * @see https://mantle.ngrok.com/components/overlays/dialog#api-reference
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
}: Omit<ComponentProps<typeof DialogPrimitiveClose>, "scope"> & WithDataSlot) => (
	<DialogPrimitiveClose
		scope={scope}
		data-slot={joinDataSlot(dataSlot, "dialog-close")}
		{...props}
	/>
);

/**
 * Renders nothing. `Dialog.Content` styles the `::backdrop` of its `<dialog>`,
 * which dims and blurs the page.
 *
 * @deprecated Remove it. `Dialog.Content` draws the backdrop.
 *
 * @see https://mantle.ngrok.com/components/overlays/dialog#api-reference
 */
const Overlay = DialogPrimitiveOverlay;

type ContentProps = Omit<
	ComponentProps<typeof DialogPrimitiveContent>,
	"positionerClassName" | "positionerSlot" | "scope" | "inline" | "layer" | "role"
> &
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
	className,
	preferredWidth,
	...props
}: ContentProps) => (
	<DialogPrimitiveContent
		scope={scope}
		positionerSlot="dialog-positioner"
		// Why `open:flex`: a `display` class would show a closed `<dialog>`.
		positionerClassName={cx(
			"fixed z-60 items-center justify-center open:flex",
			wrapperClassName[appearance],
		)}
		data-appearance={appearance}
		data-slot={joinDataSlot(dataSlot, "dialog-content")}
		className={cx(
			contentSurfaceClassName({ appearance, preferredWidth }),
			"duration-200 ease-out-strong data-state-closed:duration-150 motion-reduce:animate-none!",
			"data-state-closed:animate-out data-state-closed:fade-out-0 data-state-closed:zoom-out-95 data-state-open:animate-in data-state-open:fade-in-0 data-state-open:zoom-in-95",
			className,
		)}
		{...props}
	/>
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
	<DialogPrimitiveClose scope={scope} asChild>
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
}: Omit<ComponentProps<typeof DialogPrimitiveTitle>, "scope"> & WithDataSlot) => (
	<DialogPrimitiveTitle
		scope={scope}
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
}: Omit<ComponentProps<typeof DialogPrimitiveDescription>, "scope"> & WithDataSlot) => (
	<DialogPrimitiveDescription
		scope={scope}
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
	// oxlint-disable-next-line typescript/no-deprecated -- Why: markup written for Radix keeps working until a later minor removes them.
	Overlay,
	// oxlint-disable-next-line typescript/no-deprecated -- Why: as above.
	Portal,
	Title,
	Trigger,
};
