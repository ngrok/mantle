---
"@ngrok/mantle": minor
---

Add comparison and match operators, typed keys, grouping, and an expression tree to `@ngrok/mantle/query-filter`.

- A key with `type` (`"text"`, `"enum"`, `"number"`, `"date"`, `"duration"`, or `"boolean"`) and `getValue` takes operators, and the engine runs them: `name:=api`, `name:api*`, `name:*api`, `replicas:>3`, `replicas:<=3`, `replicas:2..5`, `created:<2026-01-01`, `created:>7d`, and `uptime:>90s`. Set `operators` to limit a key to what your backend runs. A value that does not parse for its type, or an operator the key does not accept, paints as invalid, matches no item, and is a problem in `checkFilterQuery` (`"invalid-value"` or `"unsupported-operator"`).
- `NOT` and a leading `!` exclude, as `-` does. Parentheses group: `(is:shared OR is:new) -name:api*`. `OR` binds looser than `AND`, and both bind looser than `NOT`.
- `parseFilterExpression` returns the query as a tree of `and`, `or`, `not`, `facet`, and `text` nodes, with the comma lists, the negations, and the constants normalized. Compile it to your backend's query language.
- `defineRemoteFilterGrammar` accepts `syntax: "full"` and typed keys.
- The suggestions offer the comparisons of a number, date, or duration key, recent windows such as `>7d` for a date key, `true` and `false` for a boolean key, and the exact, prefix, and suffix forms of a word typed into a text key. `Query.Legend` names the comparisons and groups when the grammar has them.
- `filterItemsByQuery` compiles the query into one test before it scans. In our benchmark of 50,000 items, `is:active` went from 0.93 ms to 0.49 ms, and no query got slower.

This is a breaking change:

- `FilterToken` has three new kinds: `"not"`, `"group-start"`, and `"group-end"`. Handle them where you switch on `token.kind`.
- `FilterKeyDefinition` is a union of a key with `matches` and a typed key with `getValue`. Narrow a key with `definition.matches != null` before you call `matches`.
- Under the `"full"` and `"conjunction"` syntax, a term that starts with `!`, the bare word `NOT`, and a `(` or `)` at the edge of a term now parse as structure. Quote such a term to keep searching for it: `"!important"`.

See the [migration guide](https://mantle.ngrok.com/migrations/0017-query-filter-operators-migration).
