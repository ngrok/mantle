---
"@ngrok/mantle": patch
---

`DataTable.Row` and `DataTable.ActionCell` now guard a clickable row the way the docs always said a consumer should.

- `DataTable.ActionCell` stops a click inside it from reaching the row's `onClick`, and keeps the click's default action, so an action menu opens without the row navigating. Before, the cell only documented that guard, and a forgotten `onClick={(event) => event.stopPropagation()}` navigated the user away when they opened the menu. Your own `onClick` on the cell still runs, and the `<td>` keeps its `role="cell"`. The `stopPropagation` handler in your code is now redundant and can go.
- `DataTable.Row` runs `onClick` only for a plain primary click. A modified click (`⌘`, `Ctrl`, `Shift`, `Alt`), a non-primary button, and a click that ends a text selection inside the row all skip it. The link inside the row answers a modified click with a new tab, and a drag-select copies text, so neither is a request to navigate.
- `DataTable.Row` stamps `data-clickable` when `onClick` is set, so a test or a stylesheet has a stable hook instead of the `cursor-pointer` class.
- A `Table.Body` row now highlights when a link or button inside it has visible focus, the same way it highlights under the pointer, so a keyboard user sees the row-scale target too.
- The docs now say why the link in the primary cell is the keyboard path, why the row keeps `role="row"`, and how to wrap that link in `SandboxedOnClick` with `asChild` and `allowClickEventDefault`. See [Navigating on row click](https://mantle.ngrok.com/components/data-display/data-table#navigating-on-row-click).
