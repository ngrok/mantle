/**
 * Re-exports for the native Dialog component.
 *
 * @see https://mantle.ngrok.com/components/overlays/dialog#native-dialog
 */

import * as DialogParts from "./dialog-native-parts.js";

/**
 * `Dialog` on the browser's modal `<dialog>`, with the same parts and the same
 * look as `@ngrok/mantle/dialog`, so a swap is an import change. The browser
 * traps focus, makes the page inert, closes on Escape, paints in the top layer,
 * and returns focus to the trigger. An uncontrolled tap opens it with no React
 * render, so the open answers in the next frame on a slow phone.
 *
 * Trade-offs:
 *
 * - The content is server-rendered and hydrated on every page, open or not.
 *   Opening costs almost nothing, but the page pays more HTML and more
 *   hydration at load.
 * - Floats composed inside portal into the `<dialog>` and work as usual, and
 *   toasts move above it. A frame that a third-party script puts on `<body>`
 *   (a captcha, a payment challenge, a chat widget) is inert under the dialog,
 *   and the browser gives no way out: keep `@ngrok/mantle/dialog` for a form
 *   that embeds one.
 * - A controlled `open` works, but each change renders React. The fast path
 *   is the uncontrolled trigger.
 * - The exit animates in Chromium only; other browsers close at once.
 * - Do not open it from inside a Radix `Dialog` or `Sheet`: the Radix overlay
 *   takes Escape first and closes itself, not the native dialog.
 * - CSS locks page scroll (`:root:has(dialog:modal)`), not JavaScript.
 *
 * @useWhen Open a modal window from a tap that must answer in one frame, such as on a
 * content-heavy page where Interaction to Next Paint counts.
 *
 * @siblings
 * - `Dialog`: the dialog holds a third-party frame, or it mounts only when it opens.
 * - `Sheet`: the content slides in from the edge of the screen.
 * - `AlertDialog`: the user must confirm a destructive or irreversible action.
 *
 * @see https://mantle.ngrok.com/components/overlays/dialog#native-dialog
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
 * import { Dialog } from "@ngrok/mantle/dialog/native";
 *
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
