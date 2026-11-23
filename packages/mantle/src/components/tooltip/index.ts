/**
 * Re-exports for the Tooltip component.
 *
 * @see https://mantle.ngrok.com/components/overlays/tooltip
 */

import * as TooltipParts from "./tooltip-parts.js";

export {
	//,
	TooltipProvider,
} from "./tooltip.js";

/**
 * A popup that displays information related to an element when the element receives keyboard focus or the mouse hovers over it.
 *
 * Use `Tooltip` to show a short, non-essential label or hint when the user
 * hovers or focuses an element (e.g., the meaning of an icon button, a
 * keyboard shortcut, or a brief explanation). Tooltips are NON-INTERACTIVE:
 * do not put buttons, links, or form controls inside one. Per the WAI-ARIA
 * tooltip pattern, tooltips never receive focus, so interactive content
 * inside them is unreachable for keyboard users. For interactive overlay
 * content (forms, settings, color pickers), use `Popover`. For non-essential
 * preview cards (user/repo previews, link previews), use `HoverCard`.
 *
 * A `<TooltipProvider>` is optional. Mount one to set the open delay for the
 * tooltips inside it.
 *
 * `Tooltip.Content` is a native `popover` in the browser's top layer, so it paints
 * above the page with no `z-index`. It portals into the content of the open
 * `Dialog`, `AlertDialog`, `Sheet`, or `Popover` that holds it, else into
 * `document.body`. It does not show while an overlay that does not hold it
 * is open. CSS anchor positioning places it; where the browser has none, a
 * script places it. Where the browser has no popover API, it is a fixed box
 * at `z-50`.
 *
 * @useWhen Show a short, non-interactive hint for an element on hover or focus, such as the meaning
 * of an icon button.
 *
 * @siblings
 * - `Popover`: the content is interactive, such as a form or a settings menu.
 * - `HoverCard`: the content is a rich preview of a link.
 *
 * @see https://mantle.ngrok.com/components/overlays/tooltip
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/
 *
 * @example
 * Composition:
 * ```
 * Tooltip.Root
 * ├── Tooltip.Trigger
 * └── Tooltip.Content
 * ```
 *
 * @example
 * ```tsx
 * <Tooltip.Root>
 *   <Tooltip.Trigger asChild>
 *     <Button type="button" appearance="outlined" intent="neutral">
 *       Hover me
 *     </Button>
 *   </Tooltip.Trigger>
 *   <Tooltip.Content>
 *     This is a tooltip
 *   </Tooltip.Content>
 * </Tooltip.Root>
 * ```
 */
const Tooltip = TooltipParts;

export {
	//,
	Tooltip,
};
