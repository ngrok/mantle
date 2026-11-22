/**
 * Re-exports for the Hover Card component.
 *
 * @see https://mantle.ngrok.com/components/overlays/hover-card
 */

import * as HoverCardParts from "./hover-card-parts.js";

/**
 * A floating card that appears when a user hovers over a trigger element.
 *
 * Use `HoverCard` for non-essential preview content shown on HOVER: user
 * cards, repo previews, rich link previews. Because hover is not reachable
 * via keyboard, all content inside a `HoverCard` must be supplemental,
 * never the only path to information; the trigger is typically a link that
 * already leads to the same content for keyboard and screen reader users.
 * For short, non-interactive labels or hints, use `Tooltip`. For
 * interactive overlays the user opens deliberately, use `Popover`.
 *
 * `HoverCard.Content` is a native `popover` in the browser's top layer, so it paints
 * above the page with no `z-index`. It portals into the content of the open
 * `Dialog`, `AlertDialog`, `Sheet`, or `Popover` that holds it, else into
 * `document.body`. It does not show while an overlay that does not hold it
 * is open. CSS anchor positioning places it; where the browser has none, a
 * script places it. Where the browser has no popover API, it is a fixed box
 * at `z-50`.
 *
 * @useWhen Preview the content behind a link on hover, such as a user card or a repository preview.
 *
 * @siblings
 * - `Tooltip`: the content is a short label or hint with no interactive content.
 * - `Popover`: the user opens interactive content on purpose, with a click or a key.
 *
 * @see https://mantle.ngrok.com/components/overlays/hover-card
 *
 * @example
 * Composition:
 * ```
 * HoverCard.Root
 * ├── HoverCard.Trigger
 * └── HoverCard.Content
 *     └── HoverCard.Arrow
 * ```
 *
 * @example
 * ```tsx
 * <HoverCard.Root>
 *   <HoverCard.Trigger asChild>
 *     <Button type="button" appearance="outlined" intent="neutral">
 *       Hover me
 *     </Button>
 *   </HoverCard.Trigger>
 *   <HoverCard.Content>
 *     <p>This is the hover card content.</p>
 *   </HoverCard.Content>
 * </HoverCard.Root>
 * ```
 */
const HoverCard = HoverCardParts;

export {
	//,
	HoverCard,
};
