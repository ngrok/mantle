/**
 * Re-exports for the Select component.
 *
 * @see https://mantle.ngrok.com/components/forms/select
 */

import * as SelectParts from "./select-parts.js";

/**
 * Displays a list of options for the user to pick from, triggered by a button.
 *
 * Use Select for a small, finite list of options (~2-15) where the user picks exactly one
 * and search/filtering is unnecessary. For larger lists or async/searchable data, use
 * Combobox. For picking multiple options, use MultiSelect.
 *
 * `Select.Content` renders at Tailwind `z-50`, Mantle's float tier. When
 * composed inside an open `Dialog`, `AlertDialog`, or `Sheet`, it portals into
 * that overlay's positioner and paints above the overlay that owns it. Outside
 * every overlay, it portals to `document.body`, below the overlay tier
 * (`z-60`). When sibling floats share a container, the most recently mounted
 * float paints on top.
 *
 * @useWhen Pick one value from a short, fixed list of options that needs no filter, such as a
 * region or an expiry duration.
 *
 * @siblings
 * - `Combobox`: the list is long or loads from a server, and the user types to filter it.
 * - `MultiSelect`: the user picks several values.
 * - `RadioGroup`: the options are few and must all show at once.
 * - `DropdownMenu`: the list runs actions and sets no value.
 *
 * @see https://mantle.ngrok.com/components/forms/select
 *
 * @example
 * Composition:
 * ```
 * Select.Root
 * ├── Select.Trigger
 * │   └── Select.Value
 * └── Select.Content
 *     ├── Select.Group
 *     │   ├── Select.Label
 *     │   └── Select.Item
 *     └── Select.Separator
 * ```
 *
 * @example
 * ```tsx
 * <Select.Root>
 *   <Select.Trigger>
 *     <Select.Value placeholder="Select a fruit" />
 *   </Select.Trigger>
 *   <Select.Content>
 *     <Select.Group>
 *       <Select.Label>Fruits</Select.Label>
 *       <Select.Item value="apple">Apple</Select.Item>
 *       <Select.Item value="banana">Banana</Select.Item>
 *       <Select.Item value="cherry">Cherry</Select.Item>
 *     </Select.Group>
 *     <Select.Separator />
 *     <Select.Group>
 *       <Select.Label>Veggies</Select.Label>
 *       <Select.Item value="carrot">Carrot</Select.Item>
 *       <Select.Item value="cucumber">Cucumber</Select.Item>
 *     </Select.Group>
 *   </Select.Content>
 * </Select.Root>
 * ```
 */
const Select = SelectParts;

export {
	//,
	Select,
};
