---
"@ngrok/mantle": patch
---

Fix the `DataTable` header accessibility contract.

- `DataTable.Header` takes an optional `column`. When the column is sorted, the cell carries `aria-sort="ascending"` or `"descending"`. Pass the same `column` you pass `DataTable.HeaderSortButton`.
- `DataTable.HeaderSortButton` keeps the column label as its accessible name. It no longer prepends a screen-reader-only "Column sorted in … order" sentence, so the name does not change on every click and a label query matches the column name alone. The sort state lives in `aria-sort` on the header cell and `data-sort-direction` on the button.
- A column that cannot sort (`disableSorting`, or `enableSorting: false` on the column) renders its label as plain text. It was a focusable button whose click did nothing.
- `DataTable.ActionHeader` renders a screen-reader-only "Actions" label when you pass no children, so the action column has a name.
- `DataTable.EmptyRow` spans the visible leaf columns, not every registered column, so a hidden column no longer stretches the empty state past the table.
- `data-expanded` on `DataTable.Row` is now documented.
