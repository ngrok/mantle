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
 * Built on top of Ariakit's Combobox primitives with full keyboard support
 * and WAI-ARIA compliance.
 *
 * Use MultiSelect when the user can choose multiple values from a list, with selected
 * items rendered as removable tags/chips. For single selection, use Combobox (with search)
 * or Select (without).
 *
 * `MultiSelect.Content` renders at Tailwind `z-50` and portals into the closest
 * `data-mantle-modal-content` element (an enclosing overlay's content), else
 * the nearest overlay's positioner, else `document.body`. Inside an overlay it
 * paints above the content that contains it. Outside one, an open overlay
 * (`z-60`) covers it.
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
 * @see https://ariakit.org/components/combobox
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
