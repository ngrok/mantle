"use client";

import type { ComponentProps, ReactNode } from "react";
import { cx } from "../../../utils/cx/cx.js";
import type { WithDataSlot } from "../../../utils/data-slot.js";
import { joinDataSlot } from "../../../utils/data-slot.js";
import {
	Close as NativeClose,
	Content as NativeContent,
	createScope,
	Description as NativeDescription,
	Root as NativeRoot,
	type RootProps,
	Title as NativeTitle,
	Trigger as NativeTrigger,
} from "../native-primitive.js";
import {
	type CloseIconButtonProps,
	CloseIconButtonView,
	contentSurfaceClassName,
	descriptionClassName,
	type DialogLayoutProps,
	titleClassName,
	wrapperClassName,
} from "../presentation.js";

/** The scope of the native parts of this family. */
const scope = createScope();

/**
 * The state owner of a native dialog. It renders no DOM. Leave `open` out for
 * the fast path: a tap opens the `<dialog>` with no React render. A controlled
 * `open` renders React on each change.
 *
 * @see https://mantle.ngrok.com/components/overlays/dialog#native-dialog
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
const Root = (props: Omit<RootProps, "scope">) => <NativeRoot scope={scope} {...props} />;

/**
 * A button that opens the dialog. It carries `command="show-modal"`, so a
 * browser with invoker commands opens the dialog even before hydration; other
 * browsers open it from a click handler.
 *
 * | Data Attribute | Value                  | Description                     |
 * | -------------- | ---------------------- | ------------------------------- |
 * | `data-state`   | `"open"` \| `"closed"` | Reflects the open state.        |
 *
 * @see https://mantle.ngrok.com/components/overlays/dialog#native-dialog
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
}: Omit<ComponentProps<typeof NativeTrigger>, "scope"> & WithDataSlot) => (
	<NativeTrigger scope={scope} data-slot={joinDataSlot(dataSlot, "dialog-trigger")} {...props} />
);

/**
 * Renders its children. The native dialog paints in the browser's top layer,
 * so it needs no portal. The part exists so markup written for
 * `@ngrok/mantle/dialog` swaps unchanged.
 *
 * @see https://mantle.ngrok.com/components/overlays/dialog#native-dialog
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
const Portal = ({ children }: { children?: ReactNode }) => children;

/**
 * Renders nothing. `Dialog.Content` styles the `<dialog>`'s `::backdrop`
 * instead. The part exists so markup written for `@ngrok/mantle/dialog` swaps
 * unchanged.
 *
 * @see https://mantle.ngrok.com/components/overlays/dialog#native-dialog
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
const Overlay = () => null;

/**
 * A button that closes the dialog when clicked. Wrap an interactive element
 * with `asChild` to delegate the close behavior to your own button.
 *
 * @see https://mantle.ngrok.com/components/overlays/dialog#native-dialog
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
}: Omit<ComponentProps<typeof NativeClose>, "scope"> & WithDataSlot) => (
	<NativeClose scope={scope} data-slot={joinDataSlot(dataSlot, "dialog-close")} {...props} />
);

type ContentProps = Omit<
	ComponentProps<typeof NativeContent>,
	"positionerClassName" | "positionerSlot" | "scope"
> &
	DialogLayoutProps &
	WithDataSlot;

/**
 * The dialog panel, inside a modal `<dialog>` (`data-slot="dialog-positioner"`)
 * that the server renders and the page hydrates whether the dialog is open or
 * not. The browser traps focus in it, makes the page behind it inert, closes it
 * on Escape, and returns focus to the trigger. A click on the backdrop closes
 * it too.
 *
 * Floats composed inside (`Popover`, `Select`, `DropdownMenu`, `Tooltip`)
 * portal into the `<dialog>`, so they paint in the top layer above the panel.
 * Toasts move into the top open native dialog. A frame that a third-party
 * script puts on `<body>`, such as a captcha or a payment challenge, is inert
 * under the dialog: keep `@ngrok/mantle/dialog` for a form that embeds one.
 *
 * | Data Attribute    | Value                                          | Description                                    |
 * | ----------------- | ---------------------------------------------- | ---------------------------------------------- |
 * | `data-appearance` | `"centered"` \| `"full-page"` \| `"full-bleed"` | Reflects the resolved `appearance`.            |
 * | `data-state`      | `"open"` \| `"closed"`                         | Reflects the open state of the `<dialog>`.     |
 *
 * @see https://mantle.ngrok.com/components/overlays/dialog#native-dialog
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
const Content = ({
	"data-slot": dataSlot,
	appearance = "centered",
	className,
	preferredWidth,
	...props
}: ContentProps) => (
	<NativeContent
		scope={scope}
		positionerSlot="dialog-positioner"
		positionerClassName={cx("items-center justify-center open:flex", wrapperClassName[appearance])}
		data-appearance={appearance}
		data-slot={joinDataSlot(dataSlot, "dialog-content")}
		className={cx(
			contentSurfaceClassName({ appearance, preferredWidth }),
			"transition-[opacity,scale] duration-200 ease-out-strong motion-reduce:transition-none",
			"group-not-open/native-dialog:scale-95 group-not-open/native-dialog:opacity-0 group-not-open/native-dialog:duration-150",
			"starting:group-open/native-dialog:scale-95 starting:group-open/native-dialog:opacity-0",
			className,
		)}
		{...props}
	/>
);

/**
 * An icon button that closes the dialog when clicked.
 *
 * @see https://mantle.ngrok.com/components/overlays/dialog#native-dialog
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
	<NativeClose scope={scope} asChild>
		<CloseIconButtonView {...props} />
	</NativeClose>
);

/**
 * An accessible name to be announced when the dialog is opened. The
 * `<dialog>` names it in `aria-labelledby`.
 *
 * @see https://mantle.ngrok.com/components/overlays/dialog#native-dialog
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
	...props
}: Omit<ComponentProps<typeof NativeTitle>, "scope"> & WithDataSlot) => (
	<NativeTitle
		scope={scope}
		data-slot={joinDataSlot(dataSlot, "dialog-title")}
		className={cx(titleClassName, className)}
		{...props}
	/>
);

/**
 * An accessible description to be announced when the dialog is opened. While
 * it is mounted, the `<dialog>` names it in `aria-describedby`.
 *
 * @see https://mantle.ngrok.com/components/overlays/dialog#native-dialog
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
	...props
}: Omit<ComponentProps<typeof NativeDescription>, "scope"> & WithDataSlot) => (
	<NativeDescription
		scope={scope}
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
