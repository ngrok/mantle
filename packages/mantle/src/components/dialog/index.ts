/**
 * Re-exports for the Dialog component.
 *
 * @see https://mantle.ngrok.com/components/overlays/dialog
 */

import * as DialogParts from "./dialog-parts.js";

/**
 * A window overlaid on either the primary window or another dialog window. Use
 * Dialog for a focused modal that interrupts the user to gather input or
 * confirm a non-destructive choice. For destructive or irreversible
 * confirmations (delete, sign out, leave without saving), prefer `AlertDialog`.
 * For side-panel content that slides in from an edge (filter panels, detail
 * views, navigation drawers), prefer `Sheet`.
 *
 * `Dialog` renders its floating layer at Tailwind `z-60`, Mantle's overlay
 * tier, above every float (`z-50`). Floats composed inside the content portal
 * into the positioner (`data-slot="dialog-positioner"`) and paint above the
 * content. When multiple overlays are open, the most recently mounted overlay
 * renders on top.
 *
 * `@ngrok/mantle/dialog/native` exports the same parts on the browser's modal
 * `<dialog>`: an uncontrolled tap opens it with no React render. Its content
 * renders and hydrates on every page, and a third-party frame on `<body>` is
 * inert under it.
 *
 * @useWhen Gather input or confirm a choice that is not destructive, in a modal window that blocks
 * the page.
 *
 * @siblings
 * - `AlertDialog`: the user must confirm a destructive or irreversible action, such as a delete.
 * - `Sheet`: the content slides in from the edge of the screen, such as a filter panel or a detail view.
 * - `Popover`: the content is small and opens next to its trigger, with no modal backdrop.
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
const Dialog = DialogParts;

export {
	//,
	Dialog,
};

export {
	//,
	isDialogOverlayTarget,
} from "./primitive.js";
