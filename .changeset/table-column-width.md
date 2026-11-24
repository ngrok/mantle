---
"@ngrok/mantle": minor
---

`Table` and `DataTable` columns now share the spare width, and cells stay on one line.

- With no `width`, a `Table.Cell` keeps its value on one line. The column asks for the full value and shares the spare width with the other columns. When the row is too narrow, the value truncates with an ellipsis, and the column holds at least 6rem. `Table.Header` also stays on one line.
- `Table.Cell` and `Table.Header` take a `width` prop: `"fit"` never truncates, for a short value such as a date or a status, and `"wrap"` lets prose wrap. `DataTable` columns read the same value from `meta.width`, which now also takes `"wrap"`.
- A `"fit"` column no longer gives its spare width to the other columns. It gets its own share.
- A cell with no `width` wraps its children in a `<div data-slot="table-cell-content">`.

Breaking: a cell whose text wrapped now truncates. Pass `width="wrap"` to keep it wrapping. The codemod adds it where the cell's `className` wraps text. See https://mantle.ngrok.com/migrations/0035-table-column-width-migration.
