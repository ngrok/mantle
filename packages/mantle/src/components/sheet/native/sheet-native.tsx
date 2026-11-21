"use client";

import type { ComponentProps } from "react";
import { cx } from "../../../utils/cx/cx.js";
import type { WithDataSlot } from "../../../utils/data-slot.js";
import { joinDataSlot } from "../../../utils/data-slot.js";
import {
	Close as NativeClose,
	Content as NativeContent,
	Description as NativeDescription,
	Root as NativeRoot,
	Title as NativeTitle,
	Trigger as NativeTrigger,
} from "../../dialog/native-primitive.js";
import {
	type CloseIconButtonProps,
	CloseIconButtonView,
	contentSurfaceClassName,
	descriptionClassName,
	type SheetLayoutProps,
	type SheetSide,
	titleClassName,
} from "../presentation.js";

/**
 * The state owner of a native sheet. It renders no DOM. Leave `open` out for
 * the fast path: a tap opens the `<dialog>` with no React render. A controlled
 * `open` renders React on each change.
 *
 * @see https://mantle.ngrok.com/components/overlays/sheet#native-sheet
 *
 * @example
 * ```tsx
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
 */
const Root = NativeRoot;

/**
 * A button that opens the sheet. It carries `command="show-modal"`, so a
 * browser with invoker commands opens the sheet even before hydration; other
 * browsers open it from a click handler.
 *
 * | Data Attribute | Value                  | Description              |
 * | -------------- | ---------------------- | ------------------------ |
 * | `data-state`   | `"open"` \| `"closed"` | Reflects the open state. |
 *
 * @see https://mantle.ngrok.com/components/overlays/sheet#native-sheet
 *
 * @example
 * ```tsx
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
 */
const Trigger = ({
	"data-slot": dataSlot,
	...props
}: ComponentProps<typeof NativeTrigger> & WithDataSlot) => (
	<NativeTrigger data-slot={joinDataSlot(dataSlot, "sheet-trigger")} {...props} />
);

/**
 * A button that closes the sheet when clicked. Wrap an interactive element
 * with `asChild` to delegate the close behavior to your own button.
 *
 * @see https://mantle.ngrok.com/components/overlays/sheet#native-sheet
 *
 * @example
 * ```tsx
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
 */
const Close = ({
	"data-slot": dataSlot,
	...props
}: ComponentProps<typeof NativeClose> & WithDataSlot) => (
	<NativeClose data-slot={joinDataSlot(dataSlot, "sheet-close")} {...props} />
);

/**
 * The slide each {@link SheetSide} enters and exits with. It keys on the
 * `<dialog>`'s `[open]` and ends at `translate: none`, so a float that the
 * sheet holds positions against the viewport once the sheet is in.
 */
const motionClassName: Record<SheetSide, string> = {
	left: "group-not-open/native-dialog:-translate-x-full starting:group-open/native-dialog:-translate-x-full",
	right:
		"group-not-open/native-dialog:translate-x-full starting:group-open/native-dialog:translate-x-full",
};

type ContentProps = Omit<
	ComponentProps<typeof NativeContent>,
	"positionerClassName" | "positionerSlot"
> &
	SheetLayoutProps &
	WithDataSlot;

/**
 * The sheet panel, inside a modal `<dialog>` (`data-slot="sheet-positioner"`)
 * that the server renders and the page hydrates whether the sheet is open or
 * not. The browser traps focus in it, makes the page behind it inert, closes it
 * on Escape, and returns focus to the trigger. A click on the backdrop closes
 * it too.
 *
 * Floats composed inside (`Popover`, `Select`, `DropdownMenu`, `Tooltip`)
 * portal into the `<dialog>`, so they paint in the top layer above the panel.
 * Toasts move into the top open native sheet. A frame that a third-party
 * script puts on `<body>`, such as a captcha or a payment challenge, is inert
 * under the sheet: keep `@ngrok/mantle/sheet` for a form that embeds one.
 *
 * | Data Attribute | Value                  | Description                                |
 * | -------------- | ---------------------- | ------------------------------------------ |
 * | `data-state`   | `"open"` \| `"closed"` | Reflects the open state of the `<dialog>`. |
 *
 * @see https://mantle.ngrok.com/components/overlays/sheet#native-sheet
 *
 * @example
 * ```tsx
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
 */
const Content = ({
	"data-slot": dataSlot,
	className,
	preferredWidth = "sm:max-w-120",
	side = "right",
	...props
}: ContentProps) => (
	<NativeContent
		positionerSlot="sheet-positioner"
		positionerClassName="inset-0"
		data-slot={joinDataSlot(dataSlot, "sheet-content")}
		className={cx(
			contentSurfaceClassName({ side, preferredWidth }),
			"transition-[translate] duration-200 ease-out-strong group-not-open/native-dialog:duration-150 motion-reduce:transition-none",
			motionClassName[side],
			className,
		)}
		{...props}
	/>
);

/**
 * An icon button that closes the sheet when clicked.
 * Should be rendered within the `Sheet.Header` as a child of `Sheet.Actions`.
 *
 * @see https://mantle.ngrok.com/components/overlays/sheet#native-sheet
 *
 * @example
 * ```tsx
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
 */
const CloseIconButton = (props: CloseIconButtonProps) => (
	<NativeClose asChild>
		<CloseIconButtonView {...props} />
	</NativeClose>
);

/**
 * The title of the sheet. The `<dialog>` names it in `aria-labelledby`.
 *
 * @see https://mantle.ngrok.com/components/overlays/sheet#native-sheet
 *
 * @example
 * ```tsx
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
 */
const Title = ({
	"data-slot": dataSlot,
	className,
	...props
}: ComponentProps<typeof NativeTitle> & WithDataSlot) => (
	<NativeTitle
		data-slot={joinDataSlot(dataSlot, "sheet-title")}
		className={cx(titleClassName, className)}
		{...props}
	/>
);

/**
 * A description of the sheet. While it is mounted, the `<dialog>` names it in
 * `aria-describedby`.
 *
 * @see https://mantle.ngrok.com/components/overlays/sheet#native-sheet
 *
 * @example
 * ```tsx
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
 */
const Description = ({
	"data-slot": dataSlot,
	className,
	...props
}: ComponentProps<typeof NativeDescription> & WithDataSlot) => (
	<NativeDescription
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
