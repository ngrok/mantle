// Why "use no memo": a server component can render this file. A stateless part gains little from
// the compiler, and its cache hook would make the build mark the chunk "use client".
"use no memo";

// Why a separate file: these parts are plain layout. `sheet.tsx` holds the parts that read
// the Radix dialog scope, which need the client.

import type { ComponentProps, HTMLAttributes } from "react";
import { cx } from "../../utils/cx/cx.js";
import type { WithDataSlot } from "../../utils/data-slot.js";
import { joinDataSlot } from "../../utils/data-slot.js";

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
	Footer,
	Header,
	TitleGroup,
};
