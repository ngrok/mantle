---
"@ngrok/mantle": minor
---

`Table` and `DataTable` columns now get equal shares of the spare width, and cells stay on one line.

- With no `width`, a `Table.Cell` keeps its value on one line. The column asks for the full value and shares the spare width with the other columns. When the row is too narrow, the value truncates with an ellipsis, and the column holds at least 6rem. `Table.Header` also stays on one line.
- `Table.Cell` and `Table.Header` take a `width` prop: `"fit"` never truncates, for a short value such as a date or a status, and `"wrap"` lets prose wrap. `DataTable` columns read the same value from `meta.width`, which now also takes `"wrap"`.
- A table with a header row of 2 to 24 cells is a CSS grid: each column gets an equal share of the spare width, so the column with the longest values no longer takes most of the row. A first column of `DataTable.ControlCell` and a last column of `DataTable.ActionHeader` stay as narrow as their controls. A table too narrow for its columns scrolls, as before. A table with no header row, or with more columns, keeps the table layout.
- Each part sets its ARIA role (`table`, `rowgroup`, `row`, `columnheader` or `rowheader`, `cell`), so screen readers keep the table semantics in the grid. A cell with `colSpan` also sets `aria-colspan`.
- A `"fit"` column no longer gives its spare width to the other columns. It gets its own share.
- A `w-*` or `max-w-*` class on a cell or header does nothing: the grid sizes each column. `min-w-*` sets a column's least width. A `vertical-align` class such as `align-top` does nothing in the grid; use `content-start`.
- A cell with no `width` wraps its children in a `<div data-slot="table-cell-content">`.

Breaking: a cell whose text wrapped now truncates. Pass `width="wrap"` to keep it wrapping. The codemod adds it where the cell's `className` wraps text. See https://mantle.ngrok.com/migrations/0035-table-column-width-migration.
