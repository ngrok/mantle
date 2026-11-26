/**
 * Re-exports for the Drawer component.
 *
 * @see https://mantle.ngrok.com/components/overlays/drawer
 */

import * as DrawerParts from "./drawer-parts.js";

/**
 * A panel that slides up from the bottom edge of the screen for a short task,
 * where a thumb reaches it on a phone. It follows a swipe down to close, with
 * a spring back, a rubber band, and a scrim that fades with the drag, and it
 * rises above the on-screen keyboard. It runs on the browser's modal
 * `<dialog>`: the page is inert, Escape and the back gesture close it, and
 * focus returns to the trigger.
 *
 * `Popover` with `presentation="auto"` presents its content in a `Drawer` on
 * a phone.
 *
 * @useWhen Show a short task or a set of choices from the bottom of a phone screen, such as filters,
 * a share sheet, or a quick form, with a swipe down to close.
 *
 * @siblings
 * - `Popover`: the task sits next to its trigger on a large screen; `presentation="auto"` turns it into a drawer on a phone.
 * - `Sheet`: the panel comes in from the left or right edge, such as a detail view.
 * - `Dialog`: the task needs a centered modal window.
 *
 * @see https://mantle.ngrok.com/components/overlays/drawer
 *
 * @example
 * Composition:
 * ```
 * Drawer.Root
 * ├── Drawer.Trigger
 * └── Drawer.Content
 *     ├── Drawer.Header
 *     │   ├── Drawer.Title
 *     │   └── Drawer.Description
 *     ├── Drawer.Body
 *     └── Drawer.Footer
 *         └── Drawer.Close
 * ```
 *
 * @example
 * ```tsx
 * <Drawer.Root>
 *   <Drawer.Trigger asChild>
 *     <Button type="button" appearance="outlined" intent="neutral">Filters</Button>
 *   </Drawer.Trigger>
 *   <Drawer.Content>
 *     <Drawer.Header>
 *       <Drawer.Title>Filters</Drawer.Title>
 *       <Drawer.Description>Show the endpoints that match.</Drawer.Description>
 *     </Drawer.Header>
 *     <Drawer.Body>…</Drawer.Body>
 *     <Drawer.Footer>
 *       <Drawer.Close asChild>
 *         <Button type="button" appearance="filled" intent="neutral">Done</Button>
 *       </Drawer.Close>
 *     </Drawer.Footer>
 *   </Drawer.Content>
 * </Drawer.Root>
 * ```
 */
const Drawer = DrawerParts;

export {
	//,
	Drawer,
};
