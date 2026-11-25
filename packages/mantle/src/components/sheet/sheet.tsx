"use client";

import type { ComponentProps } from "react";
import { cx } from "../../utils/cx/cx.js";
import type { WithDataSlot } from "../../utils/data-slot.js";
import { joinDataSlot } from "../../utils/data-slot.js";
import {
	Close as SheetPrimitiveClose,
	Content as SheetPrimitiveContent,
	createScope,
	Description as SheetPrimitiveDescription,
	Root as SheetPrimitiveRoot,
	type RootProps,
	Title as SheetPrimitiveTitle,
	Trigger as SheetPrimitiveTrigger,
} from "../dialog/native-primitive.js";
import {
	type CloseIconButtonProps,
	CloseIconButtonView,
	contentSurfaceClassName,
	descriptionClassName,
	type SheetLayoutProps,
	slideClassName,
	titleClassName,
} from "./presentation.js";

// Why a scope of its own: a sheet wraps arbitrary content, and a
// `Dialog.Trigger` inside it must bind to the nearest `Dialog.Root`, not to
// the sheet.
const scope = createScope();

/**
 * The root component for a `Sheet`. Should compose the `Sheet.Trigger` and `Sheet.Content`.
 * Acts as a stateful provider for the Sheet's open/closed state.
 *
 * Every `Sheet` part reads a dialog scope of its own, so it binds to the
 * nearest `Sheet.Root` and never to a `Dialog.Root`. The reverse holds too: a
 * `Dialog.Trigger` or `Command.SearchTrigger` inside `Sheet.Content` reaches
 * the `Dialog.Root` or `Command.DialogRoot` above the sheet, not the sheet. A
 * `Dialog.Close` inside a sheet with no `Dialog.Root` above it throws, because
 * it must render inside its `Root`; use `Sheet.Close` to close a sheet.
 *
 * `Sheet` renders its floating layer at Tailwind `z-60`, Mantle's overlay tier,
 * above every float (`z-50`). Floats composed inside the content portal into
 * the positioner (`data-slot="sheet-positioner"`) and paint above the content.
 * When multiple overlays are open, the most recently mounted overlay renders on
 * top.
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
const Root = (props: Omit<RootProps, "scope">) => <SheetPrimitiveRoot scope={scope} {...props} />;

/**
 * The button trigger for a `Sheet`. Should be rendered as a child of the `Sheet` component.
 * Renders an unstyled button by default, but can be customized with the `asChild` prop.
 *
 * Opens the nearest `Sheet.Root`. It never opens a `Dialog.Root`, and a
 * `Dialog.Trigger` inside the sheet never opens the sheet.
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
const Trigger = ({
	"data-slot": dataSlot,
	...props
}: Omit<ComponentProps<typeof SheetPrimitiveTrigger>, "scope"> & WithDataSlot) => (
	<SheetPrimitiveTrigger
		scope={scope}
		data-slot={joinDataSlot(dataSlot, "sheet-trigger")}
		{...props}
	/>
);

/**
 * The close button for a `Sheet`. Should be rendered as a child of the `Sheet.Content` component.
 * Usually contained within the `Sheet.Footer` component.
 * Renders an unstyled button by default, but can be customized with the `asChild` prop.
 *
 * Closes the nearest `Sheet.Root`. It never closes a `Dialog.Root`, and a
 * `Dialog.Close` inside the sheet never closes the sheet.
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
const Close = ({
	"data-slot": dataSlot,
	...props
}: Omit<ComponentProps<typeof SheetPrimitiveClose>, "scope"> & WithDataSlot) => (
	<SheetPrimitiveClose scope={scope} data-slot={joinDataSlot(dataSlot, "sheet-close")} {...props} />
);

type SheetContentProps = Omit<
	ComponentProps<typeof SheetPrimitiveContent>,
	"positionerClassName" | "positionerSlot" | "scope" | "inline" | "layer" | "role"
> &
	SheetLayoutProps &
	WithDataSlot;

/**
 * The main container for a `Sheet`. Should be rendered as a child of the `Sheet` component.
 * Renders on top of the overlay backdrop.
 * Should contain the `Sheet.Header`, `Sheet.Body`, and `Sheet.Footer`.
 *
 * `Sheet.Content` renders its floating layer at Tailwind `z-60`, Mantle's
 * overlay tier, above every float (`z-50`). Floats composed inside the content
 * portal into the positioner (`data-slot="sheet-positioner"`) and paint above
 * the content. When multiple overlays are open, the most recently mounted
 * overlay renders on top.
 *
 * A modal sheet makes the rest of the page inert. To keep app UI usable
 * above it, such as a consent banner, wrap the UI in `OverlayPrompt`: while
 * the sheet is open, it moves into the sheet, so it takes clicks and focus,
 * and a press in it does not close the sheet. mantle's `Toaster` and
 * `Sandbar` use it. With `modal={false}`, UI with the `overlay-prompt`
 * class takes clicks above the sheet: a click inside it does not count as
 * an outside click.
 *
 * A script can show its own popup in a frame on `<body>`, such as the 3-D
 * Secure challenge of a payment script. Set `modal={false}` on a sheet that
 * holds such a flow: a modal sheet makes the frame inert and covers it.
 * While that frame is on top at the center of the viewport, a non-modal
 * sheet yields to the popup:
 *
 * - Focus that a script moves into the popup stays there.
 * - Escape moves focus into the popup and does not close the sheet.
 * - A click in the popup is not an outside click.
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
	"data-slot": dataSlot,
	className,
	preferredWidth = "sm:max-w-120",
	side = "right",
	...props
}: SheetContentProps) => (
	<SheetPrimitiveContent
		scope={scope}
		positionerSlot="sheet-positioner"
		positionerClassName="fixed z-60"
		data-slot={joinDataSlot(dataSlot, "sheet-content")}
		className={cx(
			contentSurfaceClassName({ side, preferredWidth }),
			"data-closing:animate-out data-open:animate-in duration-200 ease-out-strong data-closing:duration-150 motion-reduce:animate-none!",
			slideClassName[side],
			className,
		)}
		{...props}
	/>
);

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
const CloseIconButton = (props: CloseIconButtonProps) => (
	<SheetPrimitiveClose scope={scope} asChild>
		<CloseIconButtonView {...props} />
	</SheetPrimitiveClose>
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
const Title = ({
	"data-slot": dataSlot,
	className,
	...props
}: Omit<ComponentProps<typeof SheetPrimitiveTitle>, "scope"> & WithDataSlot) => (
	<SheetPrimitiveTitle
		scope={scope}
		data-slot={joinDataSlot(dataSlot, "sheet-title")}
		className={cx(titleClassName, className)}
		{...props}
	/>
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
	"data-slot": dataSlot,
	className,
	...props
}: Omit<ComponentProps<typeof SheetPrimitiveDescription>, "scope"> & WithDataSlot) => (
	<SheetPrimitiveDescription
		scope={scope}
		data-slot={joinDataSlot(dataSlot, "sheet-description")}
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
	Title,
	Trigger,
};
