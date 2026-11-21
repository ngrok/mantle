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
 * Mount a `<TooltipProvider>` once at the app root when you want shared
 * tooltip behavior such as consistent delay and hover settings.
 *
 * `Tooltip.Content` renders at Tailwind `z-50`, Mantle's float tier. When
 * composed inside an open `Dialog`, `AlertDialog`, or `Sheet`, it portals into
 * that overlay's positioner and paints above the overlay that owns it. Outside
 * every overlay, it portals to `document.body`, below the overlay tier
 * (`z-60`). When sibling floats share a container, the most recently mounted
 * float paints on top.
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
