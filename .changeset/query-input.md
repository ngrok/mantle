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

Docs: https://mantle.ngrok.com/components/forms/query-input and https://mantle.ngrok.com/utils/query-filter
