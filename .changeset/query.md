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
	<Query.Content />
</Query.Root>;
```

- `Query.Root` owns the caret, the open state, and the active suggestion, and lays out its children in a row. It is controlled only: pass `value` and `onValueChange`. Pass `items` for live match counts, or leave it out when a server runs the query.
- `Query.Input` is the field, with a leading magnifier and a clear button that shows while the query has text. It takes the `<input>` props, such as `disabled`, `required`, `readOnly`, and `validation`, as `Input` does. Its children render inside the field as inline actions, before the clear button. `clearLabel` names the clear button. Inside `Field.Control`, it takes its `id`, `name`, and ARIA wiring from the `Field.Item`. Keys, values, and `OR` use the `CodeBlock` colors. Set `--query-key-color`, `--query-value-color`, or `--query-operator-color` to change them.
- `Query.Content` is the suggestion popover with the syntax legend and keyboard hints. `enterHint` names what Enter does. When no suggestion matches, it stays open and an empty state says what the field accepts. Its children render under the hints.
- Data attributes: `data-slot` is `query`, `query-input`, `query-input-actions`, `query-content`, and `query-content-footer`.

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

Docs: https://mantle.ngrok.com/components/forms/query and https://mantle.ngrok.com/utils/query-filter
