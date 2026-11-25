/**
 * Re-exports for the Multi Select component.
 *
 * @see https://mantle.ngrok.com/components/forms/multi-select
 */

import * as MultiSelectParts from "./multi-select-parts.js";

/**
 * A multi-select combobox that allows users to select multiple values with
 * typeahead filtering. Selected values are displayed as removable tags.
 *
 * Built on mantle's own listbox behavior, with full keyboard support and the
 * WAI-ARIA combobox pattern.
 *
 * Use MultiSelect when the user can choose multiple values from a list, with selected
 * items rendered as removable tags/chips. For single selection, use Combobox (with search)
 * or Select (without).
 *
 * `MultiSelect.Content` renders at Tailwind `z-50`. Inside an open `Dialog`,
 * `AlertDialog`, or `Sheet`, it portals into that overlay's positioner and
 * paints above the overlay that owns it. Outside every overlay, it portals to
 * `document.body`, below the overlay tier (`z-60`).
 *
 * @useWhen Pick several values from a list with a typeahead filter, and show the picks as removable
 * tags.
 *
 * @siblings
 * - `Combobox`: the user picks one value with a filter.
 * - `Select`: the user picks one value from a short list.
 * - `SelectableList`: the options show inline as checkbox rows, with no popover.
 *
 * @see https://mantle.ngrok.com/components/forms/multi-select
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/combobox/
 *
 * @example
 * Composition:
 * ```
 * MultiSelect.Root
 * ├── MultiSelect.Trigger
 * │   ├── MultiSelect.TagValues
 * │   └── MultiSelect.Input
 * └── MultiSelect.Content
 *     ├── MultiSelect.Group
 *     │   ├── MultiSelect.GroupLabel
 *     │   ├── MultiSelect.GroupDescription
 *     │   └── MultiSelect.Item
 *     ├── MultiSelect.Separator
 *     ├── MultiSelect.Empty
 *     └── MultiSelect.ContentFooter
 * ```
 *
 * @example
 * ```tsx
 * <MultiSelect.Root>
 *   <MultiSelect.Trigger>
 *     <MultiSelect.TagValues />
 *     <MultiSelect.Input placeholder="Select items..." />
 *   </MultiSelect.Trigger>
 *   <MultiSelect.Content>
 *     <MultiSelect.Item value="apple">Apple</MultiSelect.Item>
 *     <MultiSelect.Item value="banana">Banana</MultiSelect.Item>
 *     <MultiSelect.Item value="cherry">Cherry</MultiSelect.Item>
 *   </MultiSelect.Content>
 * </MultiSelect.Root>
 * ```
 */
const MultiSelect = MultiSelectParts;

export {
	//,
	MultiSelect,
};
