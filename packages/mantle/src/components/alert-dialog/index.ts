/**
 * Re-exports for the Alert Dialog component.
 *
 * @see https://mantle.ngrok.com/components/overlays/alert-dialog
 */

import * as AlertDialogParts from "./alert-dialog-parts.js";

/**
 * A modal dialog that interrupts the user with important content and expects a
 * response. Use AlertDialog for destructive or irreversible confirmations
 * (delete, sign out, leave without saving) where the user must explicitly
 * acknowledge before proceeding. It blocks all background interaction by
 * default. For non-destructive input modals or confirmation flows, use
 * `Dialog` instead. For side-panel content (filter panels, detail views,
 * navigation drawers), use `Sheet`.
 *
 * `AlertDialog` renders its floating layer at Tailwind `z-60`, Mantle's overlay
 * tier, above every float (`z-50`). Floats composed inside the content portal
 * into the positioner (`data-slot="alert-dialog-positioner"`) and paint above
 * the content. When multiple overlays are open, the most recently mounted
 * overlay renders on top.
 *
 * @useWhen The user must confirm a destructive or irreversible action, such as a delete or a
 * sign-out, before it runs.
 *
 * @siblings
 * - `Dialog`: a modal window gathers input or confirms a choice that is not destructive.
 * - `Sheet`: the content slides in from the edge of the screen, such as a filter panel or a detail view.
 * - `Sandbar`: the page holds unsaved changes, and a bar waits for the user to save or discard them.
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
 *     <Button type="button" appearance="outlined" intent="neutral">
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
const AlertDialog = AlertDialogParts;

export {
	//,
	AlertDialog,
};
