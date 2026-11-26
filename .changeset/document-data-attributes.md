---
"@ngrok/mantle": patch
---

Document every data attribute that mantle components render.

- Each part's JSDoc and its docs page now list each `data-*` attribute it renders, with its values and meaning. This includes internal markers such as `data-mantle-popup`, `data-value`, and `data-closing`.
- Each component record in `dist/agent.json` has a new `dataAttributes` field, read from the docs page's API reference. `/api/components.json` and the MCP `get` tool serve the same data.
- `Table.Root`'s data attributes are now a JSDoc table, not a list. The `Query` JSDoc tables use the `Data Attribute` column name.

Docs: https://mantle.ngrok.com/components/navigation/tabs#api-reference
