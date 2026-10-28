---
"@ngrok/mantle": minor
---

Add `Query` and `@ngrok/mantle/query-filter`, the filter language it speaks.

`Query` is a single-line filter field where free text and `key:value` qualifiers interleave, such as `is:shared -staging api`. The field colors each token in place. A suggestion popover completes keys and values while the caret stays in the field. The field is a real `<input role="combobox">`, so the caret, selection, IME composition, paste, and undo stay native.

```tsx
import { type FilterGrammar, filterItemsByQuery } from "@ngrok/mantle/query-filter";
import { Query } from "@ngrok/mantle/query";

<Query.Root grammar={projectFilterGrammar} items={projects} value={query} onValueChange={setQuery}>
	<Query.Input aria-label="Filter projects" placeholder="Filter projects, or type a filter like is:shared" />
	<Query.Content>
		<Query.List>{(suggestion) => <Query.Item suggestion={suggestion} />}</Query.List>
		<Query.Empty />
		<Query.Footer>
			<Query.Legend />
			<Query.KeyboardHints />
		</Query.Footer>
	</Query.Content>
</Query.Root>;
```

- `Query.Root` owns the caret, the open state, and the active suggestion, and lays out its children in a row. It is controlled only: pass `value` and `onValueChange`. Pass `items` for live match counts, or leave it out when a server runs the query.
- `Query.Input` is the field, with a leading magnifier and a clear button that shows while the query has text. It takes the `<input>` props, such as `disabled`, `required`, `readOnly`, and `validation`, as `Input` does. Its children render inside the field as inline actions, before the clear button. `clearLabel` names the clear button, and `onClear` runs after a clear. Inside `Field.Control`, it takes its `id`, `name`, and ARIA wiring from the `Field.Item`. Keys, values, and `OR` use the `CodeBlock` colors. Set `--query-key-color`, `--query-value-color`, or `--query-operator-color` to change them.
- `Query.Content` is the suggestion popover. You compose its parts, and you leave out a part to remove it. It accepts the `Popover.Content` props, such as `side` and `id`, except the ones it owns.
- `Query.List` is the listbox, grouped under "Filter by", "Exclude", and "Values". Its child is a function that gets each suggestion and returns a `Query.Item`.
- `Query.Item` is one suggestion row. It shows the label, the description, and the match count, or the children you pass. Call `preventDefault()` in its `onClick` to skip the insert.
- `Query.Empty` shows when no suggestion matches, and the popover stays open. By default, it says what the field accepts at the caret.
- `Query.Footer` stays under the rows while they scroll, and it joins the input's description while the popover is open. It takes `asChild`.
- `Query.Legend` shows the syntax the grammar honors. `Query.KeyboardHints` shows the keys the field answers to, and `enterHint` names what Enter does.
- Data attributes: `data-slot` is `query`, `query-input`, `query-input-actions`, `query-content`, `query-list`, `query-item`, `query-empty`, `query-footer`, `query-legend`, and `query-keyboard-hints`. `data-highlighted` marks the active row, or the row under the pointer.

`@ngrok/mantle/query-filter` has no React import, so a server or a script can parse and match with the same rules. It exports the `FilterGrammar` contract, `defineRemoteFilterGrammar`, the total parser `parseFilterQuery`, `toggleFacet` to add or remove one qualifier, the matchers `filterItemsByQuery` and `countItemsByQuery`, `getFilterSuggestions`, and `getHighlightSegments`. For a natural-language search, `describeFilterGrammar` describes the language as JSON for a model, and `checkFilterQuery` finds the unknown keys and values in the query that the model returns, and the bare terms that a `"conjunction"` grammar cannot run. These two helpers are in preview, so their API can change.

The engine is faster than the copy it replaces in ngrok's apps. It compiles a query once per pass, reads each item's search text by index, and counts the value suggestions over the items the rest of the query keeps. Median times on 50,000 items:

| Case                                           | Before  | After  |
| ---------------------------------------------- | ------- | ------ |
| Filter by one term                             | 2.9 ms  | 1.3 ms |
| Filter by qualifiers, an exclusion, and a term | 4.7 ms  | 1.8 ms |
| Filter with `OR`                               | 4.9 ms  | 2.6 ms |
| Filter by three exclusions                     | 5.4 ms  | 2.6 ms |
| Count a new query                              | 3.1 ms  | 1.3 ms |
| Value suggestions, the rest narrows            | 12.8 ms | 2.1 ms |
| Value suggestions, the rest keeps all          | 15.4 ms | 4.7 ms |
| Value suggestions after a refetch              | 12.4 ms | 3.3 ms |

For each items array, the caches cost up to one pointer and 4 bytes per item, and at most 1,000 counts.

Docs: https://mantle.ngrok.com/components/forms/query and https://mantle.ngrok.com/utils/query-filter
