/**
 * Re-exports for the Radio Group component.
 *
 * @see https://mantle.ngrok.com/components/forms/radio-group
 */

import * as RadioGroupParts from "./radio-group-parts.js";

/**
 * A group of radio items. It manages the state of the children radios.
 *
 * @useWhen Pick exactly one value from a few fixed options, with every option visible at once.
 *
 * @siblings
 * - `Select`: the set is long, or the form has little space.
 * - `Checkbox`: the user picks any number of options.
 * - `Choice`: each radio needs a title and a description beside it.
 * - `SegmentedControl`: a few short options switch a view or a mode in one row.
 *
 * @see https://mantle.ngrok.com/components/forms/radio-group#radiogrouproot
 *
 * @example
 * Composition:
 * ```
 * # Default radios
 * RadioGroup.Root
 * └── RadioGroup.Item
 *     ├── RadioGroup.Indicator
 *     └── RadioGroup.ItemContent
 *
 * # List layout with descriptions
 * RadioGroup.List
 * └── RadioGroup.ListItem
 *     ├── RadioGroup.Indicator
 *     └── RadioGroup.ItemContent
 *
 * # Card-style radios
 * RadioGroup.Root
 * └── RadioGroup.Card
 *     └── RadioGroup.Indicator
 *
 * # Rich option layout (Choice)
 * RadioGroup.Root
 * └── RadioGroup.Item
 *     └── Choice.Root
 *         ├── Choice.Indicator
 *         │   └── RadioGroup.Indicator
 *         └── Choice.Content
 *             ├── Choice.Title
 *             └── Choice.Description
 * ```
 *
 * @example
 * ```tsx
 * <RadioGroup.Root value={value} onValueChange={setValue}>
 *   <RadioGroup.Item value="option1">
 *     <RadioGroup.Indicator />
 *     <span>Option 1</span>
 *   </RadioGroup.Item>
 *   <RadioGroup.Item value="option2">
 *     <RadioGroup.Indicator />
 *     <span>Option 2</span>
 *   </RadioGroup.Item>
 * </RadioGroup.Root>
 * ```
 */
const RadioGroup = RadioGroupParts;

export {
	//,
	RadioGroup,
};
