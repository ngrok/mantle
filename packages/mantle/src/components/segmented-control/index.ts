/**
 * Re-exports for the Segmented Control component.
 *
 * @see https://mantle.ngrok.com/components/forms/segmented-control
 */

import * as SegmentedControlParts from "./segmented-control-parts.js";

/**
 * A row of segments that switches between a few short options, like a view
 * or an environment. A raised thumb slides to the checked item,
 * and a mouse or a finger can drag it. It is a radio group underneath, with
 * the same keyboard, ARIA, and form contract as `RadioGroup`.
 *
 * @useWhen Switch between a few short options in one compact, inline row, such as a view, an
 * environment, or a filter.
 *
 * @siblings
 * - `RadioGroup`: a form field whose options need a description, or stack in a column.
 * - `Tabs`: each option shows its own panel of content.
 * - `Select`: the set is long, or the row has little space.
 *
 * @see https://mantle.ngrok.com/components/forms/segmented-control
 *
 * @example
 * Composition:
 * ```
 * SegmentedControl.Root
 * └── SegmentedControl.Item
 * ```
 *
 * @example
 * ```tsx
 * <SegmentedControl.Root aria-label="Environment" defaultValue="production">
 *   <SegmentedControl.Item value="development">Dev</SegmentedControl.Item>
 *   <SegmentedControl.Item value="staging">Staging</SegmentedControl.Item>
 *   <SegmentedControl.Item value="production">Prod</SegmentedControl.Item>
 * </SegmentedControl.Root>
 * ```
 */
const SegmentedControl = SegmentedControlParts;

export {
	//,
	SegmentedControl,
};
