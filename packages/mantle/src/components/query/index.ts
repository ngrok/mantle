/**
 * Re-exports for the Query component.
 *
 * @see https://mantle.ngrok.com/components/forms/query
 */

import * as QueryParts from "./query-parts.js";

/**
 * A single-line filter field where free text and `key:value` qualifiers
 * interleave. The tokens are colored in place, and a suggestion popover
 * completes keys and values while the caret stays in the field. The grammar from
 * `@ngrok/mantle/query-filter` decides the vocabulary.
 *
 * The typed string is the only state, and the caller owns it. Inside a
 * `<form>`, Enter submits the form unless it accepts an active suggestion.
 *
 * @useWhen Filter a list with a typed query of free text and `key:value` qualifiers. Its
 * `keyboardShortcut` prop makes the slash key (`/`) a keyboard shortcut that focuses the field
 * while no other text field has focus.
 *
 * @siblings
 * - `Input`: a plain search box with no query language.
 * - `Combobox`: pick one value from a filtered list of options.
 * - `MultiSelect`: pick several values, shown as tags.
 * - `Command`: a `⌘K` palette that runs an action or navigates.
 *
 * @see https://mantle.ngrok.com/components/forms/query
 *
 * @example
 * Composition:
 * ```
 * Query.Root
 * ├── Query.Input
 * └── Query.Content
 *     ├── Query.List
 *     │   └── Query.Item
 *     ├── Query.Empty
 *     └── Query.Footer
 *         ├── Query.Legend
 *         └── Query.KeyboardHints
 * ```
 *
 * @example
 * ```tsx
 * const [query, setQuery] = useState("");
 *
 * <Query.Root grammar={projectFilterGrammar} items={projects} value={query} onValueChange={setQuery}>
 *   <Query.Input aria-label="Filter projects" placeholder="Filter projects, or type a filter like is:shared" />
 *   <Query.Content>
 *     <Query.List>{(suggestion) => <Query.Item suggestion={suggestion} />}</Query.List>
 *     <Query.Empty />
 *     <Query.Footer>
 *       <Query.Legend />
 *       <Query.KeyboardHints />
 *     </Query.Footer>
 *   </Query.Content>
 * </Query.Root>
 * ```
 */
const Query = QueryParts;

export {
	//,
	Query,
};

export type {
	//,
	QueryContentProps,
	QueryEmptyProps,
	QueryFooterProps,
	QueryInputProps,
	QueryItemProps,
	QueryKeyboardHintsProps,
	QueryLegendProps,
	QueryListProps,
	QueryRootProps,
} from "./query.js";
