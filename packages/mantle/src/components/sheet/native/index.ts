/**
 * Re-exports for the native Sheet component.
 *
 * @see https://mantle.ngrok.com/components/overlays/sheet#native-sheet
 */

import * as SheetParts from "./sheet-native-parts.js";

/**
 * `Sheet` on the browser's modal `<dialog>`, with the same parts and the same
 * look as `@ngrok/mantle/sheet`, so a swap is an import change. The browser
 * traps focus, makes the page inert, closes on Escape, paints in the top layer,
 * and returns focus to the trigger. An uncontrolled tap opens it with no React
 * render, so the open answers in the next frame on a slow phone, such as a
 * mobile navigation menu.
 *
 * Trade-offs:
 *
 * - The content is server-rendered and hydrated on every page, open or not.
 *   Opening costs almost nothing, but the page pays more HTML and more
 *   hydration at load.
 * - Floats composed inside portal into the `<dialog>` and work as usual, and
 *   toasts move above it. A frame that a third-party script puts on `<body>`
 *   (a captcha, a payment challenge, a chat widget) is inert under the sheet,
 *   and the browser gives no way out: keep `@ngrok/mantle/sheet` for a form
 *   that embeds one.
 * - A controlled `open` works, but each change renders React. The fast path
 *   is the uncontrolled trigger.
 * - The exit animates in Chromium only; other browsers close at once.
 * - CSS locks page scroll (`:root:has(dialog:modal)`), not JavaScript.
 *
 * @useWhen Open a panel from the edge of the screen from a tap that must answer in one frame,
 * such as a mobile navigation menu on a content-heavy page.
 *
 * @siblings
 * - `Sheet`: the panel holds a third-party frame, or it mounts only when it opens.
 * - `Dialog`: the task fits a centered modal window.
 * - `Sidebar`: the panel holds the persistent navigation of the app.
 *
 * @see https://mantle.ngrok.com/components/overlays/sheet#native-sheet
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
 * import { Sheet } from "@ngrok/mantle/sheet/native";
 *
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
const Sheet = SheetParts;

export {
	//,
	Sheet,
};
