---
"@ngrok/mantle": minor
---

Add `QueryInput` and `@ngrok/mantle/query-filter`, the filter language it speaks.

`QueryInput` is a single-line filter field where free text and `key:value` qualifiers interleave, such as `is:shared -staging api`. The field colors each token in place. A suggestion popover completes keys and values while the caret stays in the field. The field is a real `<input role="combobox">`, so the caret, selection, IME composition, paste, and undo stay native.

```tsx
import { type FilterGrammar, filterItemsByQuery } from "@ngrok/mantle/query-filter";
import { QueryInput } from "@ngrok/mantle/query-input";

<QueryInput.Root grammar={projectFilterGrammar} items={projects} value={query} onValueChange={setQuery}>
	<QueryInput.Field aria-label="Filter projects" placeholder="Filter projects, or type a filter like is:shared" />
	<QueryInput.Content />
</QueryInput.Root>;
```

- `QueryInput.Root` owns the caret, the open state, and the active suggestion, and lays out its children in a row. It is controlled only: pass `value` and `onValueChange`. Pass `items` for live match counts, or leave it out when a server runs the query.
- `QueryInput.Field` is the input, with a leading magnifier. Its children render inside the field as inline actions. Inside `Field.Control`, it takes its `id`, `name`, and ARIA wiring from the `Field.Item`.
- `QueryInput.Content` is the suggestion popover with the syntax legend. Its children render under the legend.
- Data attributes: `data-slot` is `query-input`, `query-input-field`, `query-input-field-actions`, `query-input-content`, and `query-input-content-footer`.

`@ngrok/mantle/query-filter` has no React import, so a server or a script can parse and match with the same rules. It exports the `FilterGrammar` contract, `defineRemoteFilterGrammar`, the total parser `parseFilterQuery`, the matchers `filterItemsByQuery` and `countItemsByQuery`, `getFilterSuggestions`, and `getHighlightSegments`.

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

Docs: https://mantle.ngrok.com/components/forms/query-input and https://mantle.ngrok.com/utils/query-filter
