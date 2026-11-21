/**
 * Re-exports for the Description List component.
 *
 * @see https://mantle.ngrok.com/components/data-display/description-list
 */

import * as DescriptionListParts from "./description-list-parts.js";

/**
 * A semantically correct description list built on the HTML `<dl>` element.
 * Renders a list of label/value pairs with alternating row backgrounds,
 * commonly used in detail views to display metadata about a resource
 * (e.g., API keys, secrets, domains).
 *
 * Compose with `DescriptionList.Item`, `DescriptionList.Label`, and
 * `DescriptionList.Value` as direct children.
 *
 * @useWhen Show the label and value pairs of one resource, such as the metadata on a detail page.
 *
 * @siblings
 * - `Table`: several records share the same columns.
 * - `Strata`: the pairs are headed sections of controls, not read-only data.
 *
 * @see https://mantle.ngrok.com/components/data-display/description-list
 * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dl
 *
 * @example
 * Composition:
 * ```
 * DescriptionList.Root
 * └── DescriptionList.Item
 *     ├── DescriptionList.Label
 *     └── DescriptionList.Value
 * ```
 *
 * @example
 * ```tsx
 * <DescriptionList.Root>
 *   <DescriptionList.Item>
 *     <DescriptionList.Label>Name</DescriptionList.Label>
 *     <DescriptionList.Value>my-api-key</DescriptionList.Value>
 *   </DescriptionList.Item>
 *   <DescriptionList.Item>
 *     <DescriptionList.Label>ID</DescriptionList.Label>
 *     <DescriptionList.Value>
 *       aigk_2fKm9x8Hn3QpYT7zKlR0vW5
 *     </DescriptionList.Value>
 *   </DescriptionList.Item>
 * </DescriptionList.Root>
 * ```
 */
const DescriptionList = DescriptionListParts;

export {
	//,
	DescriptionList,
};

export type {
	//,
	DescriptionListItemProps,
	DescriptionListLabelProps,
	DescriptionListProps,
	DescriptionListValueProps,
} from "./description-list.js";
