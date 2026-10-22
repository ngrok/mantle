---
"@ngrok/mantle": patch
---

Add a column width setting to `DataTable`. Set `meta: { width: "fit" }` on a column, and pass `column` to its `DataTable.Header` and to each `DataTable.Cell`. The column is then only as wide as its widest value, on one line, and the spare width goes to the other columns. You no longer need `className="w-px"` on the header and `className="whitespace-nowrap"` on each cell.

- `DataTable.Cell` is now a `DataTable` part. It takes an optional `column` prop, and its `data-slot` is `"data-table-cell table-cell"`.
- `DataTable.Header` and `DataTable.Cell` stamp `data-column-width="fit"` on a fit column.
- mantle adds `width` to TanStack Table's global `ColumnMeta` interface. A table with a `columnMeta` slot must add the new `DataTableColumnMeta` type to its slot type.

See https://mantle.ngrok.com/components/data-display/data-table#sizing-a-column-to-its-content.
