/**
 * Re-exports for the Sheet component.
 *
 * @see https://mantle.ngrok.com/components/overlays/sheet
 */

import * as SheetParts from "./sheet-parts.js";

/**
 * A container that overlays the current view from the edge of the screen.
 * It is a lightweight way of allowing users to complete a task without losing
 * contextual information of the view beneath it. Use Sheet for side-panel
 * content that slides in from the left or right edge: filter panels,
 * detail/inspector views, navigation drawers, mobile menus. For a centered modal that
 * interrupts the user, use `Dialog` (or `AlertDialog` for destructive
 * confirmations).
 *
 * `Sheet` runs on the browser's modal `<dialog>`: the browser traps focus,
 * makes the page inert, closes it on Escape, paints it in the top layer, and
 * returns focus to the trigger. Floats composed inside the content portal into
 * the `<dialog>` (`data-slot="sheet-positioner"`) and paint above it. The
 * content mounts when the sheet opens; `forceMount` keeps it mounted and
 * server-rendered, so an uncontrolled tap opens it with no React render, such
 * as for a mobile navigation menu. Set `modal={false}` on the root for a flow
 * whose frame a third-party script puts on `<body>`, such as a 3-D Secure
 * challenge.
 *
 * @useWhen Open a panel from the edge of the screen for a task beside the current view, such as a
 * filter panel, a detail view, or a mobile menu.
 *
 * @siblings
 * - `Dialog`: the task fits a centered modal window.
 * - `AlertDialog`: the user must confirm a destructive or irreversible action.
 * - `Sidebar`: the panel holds the persistent navigation of the app.
 *
 * @see https://mantle.ngrok.com/components/overlays/sheet
 *
 * @example
 * Composition:
 * ```
 * Sheet.Root
 * ├── Sheet.Trigger
 * └── Sheet.Content
 *     ├── Sheet.Header
 *     │   ├── Sheet.TitleGroup
 *     │   │   ├── Sheet.Title
 *     │   │   └── Sheet.Actions
 *     │   └── Sheet.Description
 *     ├── Sheet.Body
 *     └── Sheet.Footer
 *         └── Sheet.Close
 * ```
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
const Sheet = SheetParts;

export {
	//,
	Sheet,
};
