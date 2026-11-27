/**
 * Re-exports for the StatusStrip component.
 *
 * @see https://mantle.ngrok.com/components/data-display/status-strip
 */

import * as StatusStripParts from "./status-strip-parts.js";

/**
 * A row of equal cells over time, such as one cell for each hour or day. Each
 * cell is shaded by its share of the time in one state, from 0 to 1, or shows
 * that it has no data, which is not the same as 0. Each cell can take its own
 * `title`.
 *
 * The strip is `role="img"` and needs a summary in `aria-label` or
 * `aria-labelledby`. When nearby text already says the same thing, pass
 * `aria-hidden` in place of a name.
 *
 * @useWhen Show when something was in one state over time, such as in stock or up, as a row of equal
 * cells for each hour or day.
 *
 * @siblings
 * - `ProgressBar`: show one value, such as how much of a task is complete.
 * - `BarChart`: read exact values over time from axes and a tooltip.
 *
 * @see https://mantle.ngrok.com/components/data-display/status-strip
 *
 * @example
 * Composition:
 * ```
 * StatusStrip.Root
 * └── StatusStrip.Cell
 * ```
 *
 * @example
 * ```tsx
 * <StatusStrip.Root aria-label="In stock 75% of the last 4 hours">
 *   <StatusStrip.Cell value={1} title="09:00 UTC: in stock" />
 *   <StatusStrip.Cell value={0.5} title="10:00 UTC: in stock in 1 of 2 readings" />
 *   <StatusStrip.Cell value={0} title="11:00 UTC: sold out" />
 *   <StatusStrip.Cell value={null} title="12:00 UTC: no reading" />
 * </StatusStrip.Root>
 * ```
 */
const StatusStrip = StatusStripParts;

export {
	//,
	StatusStrip,
};
export type {
	//,
	StatusStripRootProps,
	StatusStripCellProps,
} from "./status-strip.js";
