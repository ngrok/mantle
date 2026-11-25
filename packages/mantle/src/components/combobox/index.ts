/**
 * Re-exports for the Combobox component.
 *
 * @see https://mantle.ngrok.com/components/forms/combobox
 */

import * as ComboboxParts from "./combobox-parts.js";

/**
 * Fill in a React input field with autocomplete & autosuggest functionalities.
 * Choose from a list of suggested values with full keyboard support.
 * It follows the WAI-ARIA Combobox Pattern and builds on mantle's own listbox behavior.
 *
 * Use Combobox for a list of options where the user types to filter: large static lists,
 * async/server-side data, or any single-select where search is helpful. For very small
 * finite lists with no filtering, prefer Select. For multi-selection, prefer MultiSelect.
 *
 * `Combobox.Content` renders in place at Tailwind `z-50`, Mantle's float tier.
 * It does not portal, so the dialog primitive's Escape guard can see it. Inside
 * an overlay it paints with the overlay's content. Outside one, an open overlay
 * (`z-60`) covers it.
 *
 * @useWhen Pick one value from a long list of options, with a text field that filters the options
 * as the user types.
 *
 * @siblings
 * - `Select`: the list is short and needs no filter.
 * - `MultiSelect`: the user picks several values, shown as tags.
 * - `Command`: the list runs actions or goes to pages, in a palette.
 * - `Query`: the field filters a list with free text and `key:value` qualifiers.
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/combobox/
 *
 * @see https://mantle.ngrok.com/components/forms/combobox
 *
 * @example
 * Composition:
 * ```
 * Combobox.Root
 * ├── Combobox.Input
 * └── Combobox.Content
 *     ├── Combobox.Group
 *     │   ├── Combobox.GroupLabel
 *     │   └── Combobox.Item
 *     │       └── Combobox.ItemValue
 *     ├── Combobox.Separator
 *     └── Combobox.ContentFooter
 * ```
 *
 * @example
 * ```tsx
 * <Combobox.Root>
 *   <Combobox.Input />
 *   <Combobox.Content>
 *     <Combobox.Item value="Apple" />
 *     <Combobox.Item value="Banana" />
 *   </Combobox.Content>
 * </Combobox.Root>
 * ```
 */
const Combobox = ComboboxParts;

export {
	//,
	Combobox,
};
