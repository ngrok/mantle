/**
 * Re-exports for the Popover component.
 *
 * @see https://mantle.ngrok.com/components/overlays/popover
 */

import * as PopoverParts from "./popover-parts.js";

/**
 * A floating overlay that displays rich content in a portal, triggered by a button.
 *
 * Use `Popover` for INTERACTIVE overlay content: small forms, settings
 * menus, color pickers, action lists. The user opens it deliberately
 * (click/tap or focus + space). For short, non-interactive label hints
 * triggered by hover, use `Tooltip` instead. For non-essential preview
 * content shown on hover, use `HoverCard`.
 *
 * `Popover` is a non-modal dialog by default: focus moves into the content
 * when it opens, `Escape` closes and returns focus to the trigger, clicking
 * outside dismisses, and the page (body and any scroll containers) continues
 * to scroll normally. For a task that must block the page, use `Dialog`.
 *
 * `Popover.Content` is a native `popover` in the browser's top layer, so it paints
 * above the page with no `z-index`. It portals into the content of the open
 * `Dialog`, `AlertDialog`, `Sheet`, or `Popover` that holds it, else into
 * `document.body`. It does not show while an overlay that does not hold it
 * is open. A script places it next to its trigger. Where the browser has no
 * popover API, it is a fixed box at `z-50`.
 *
 * @useWhen Show interactive content, such as a small form, a settings menu, or a color picker, that
 * the user opens from a button.
 *
 * @siblings
 * - `Tooltip`: the content is a short label or hint that shows on hover or focus.
 * - `HoverCard`: the content is a preview of a link that shows on hover.
 * - `DropdownMenu`: the content is a list of actions.
 * - `Dialog`: the task needs a modal window that blocks the page.
 *
 * @see https://mantle.ngrok.com/components/overlays/popover
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
 *
 * @example
 * Composition:
 * ```
 * Popover.Root
 * ├── Popover.Trigger
 * ├── Popover.Anchor
 * └── Popover.Content
 *     ├── Popover.Arrow
 *     └── Popover.Close
 * ```
 *
 * @example
 * ```tsx
 * <Popover.Root>
 *   <Popover.Trigger asChild>
 *     <Button type="button" appearance="outlined" intent="neutral">
 *       Open Popover
 *     </Button>
 *   </Popover.Trigger>
 *   <Popover.Content>
 *     <p>This is the popover content.</p>
 *   </Popover.Content>
 * </Popover.Root>
 * ```
 */
const Popover = PopoverParts;

export {
	//,
	Popover,
};
