/**
 * Re-exports for the Checkbox component.
 *
 * @see https://mantle.ngrok.com/components/forms/checkbox
 */

import * as CheckboxGroupParts from "./checkbox-group-parts.js";

/**
 * A group of checkbox cards: the card variant of `Checkbox`. The user checks
 * any number of cards, and the group holds the checked values as a `string[]`.
 *
 * @useWhen Pick any number of options from a few fixed ones, shown as selectable cards with a
 * title and a description, such as a "select all that apply" question.
 *
 * @siblings
 * - `RadioGroup`: the user picks exactly one card, with `RadioGroup.Card`.
 * - `Checkbox`: each option is one line of text beside a check box.
 * - `MultiSelect`: the set is long, or the form has little space.
 *
 * @see https://mantle.ngrok.com/components/forms/checkbox#checkboxgrouproot
 *
 * @example
 * Composition:
 * ```
 * CheckboxGroup.Root
 * └── CheckboxGroup.Card
 *     ├── CheckboxGroup.ItemContent
 *     └── CheckboxGroup.Indicator
 * ```
 *
 * @example
 * ```tsx
 * <CheckboxGroup.Root aria-label="Interests" defaultValue={["tunnels"]} name="interests">
 *   <CheckboxGroup.Card value="tunnels">
 *     <CheckboxGroup.ItemContent>
 *       <p className="text-strong font-medium">Tunnels</p>
 *       <p className="text-muted">Put a local service online.</p>
 *     </CheckboxGroup.ItemContent>
 *     <CheckboxGroup.Indicator />
 *   </CheckboxGroup.Card>
 *   <CheckboxGroup.Card value="gateway">
 *     <CheckboxGroup.ItemContent>
 *       <p className="text-strong font-medium">API gateway</p>
 *       <p className="text-muted">Secure and route API traffic.</p>
 *     </CheckboxGroup.ItemContent>
 *     <CheckboxGroup.Indicator />
 *   </CheckboxGroup.Card>
 * </CheckboxGroup.Root>
 * ```
 */
const CheckboxGroup = CheckboxGroupParts;

export { Checkbox } from "./checkbox.js";
export { selectAllChecked } from "./select-all-checked.js";

export {
	//,
	CheckboxGroup,
};

export type {
	//,
	CheckedState,
} from "./checkbox.js";
