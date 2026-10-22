---
"@ngrok/mantle": patch
---

Add `DataTable.ControlCell`, a `<td>` for a row's expand toggle or selection checkbox. A click on its padding focuses and clicks the control, and no click in it reaches a clickable row. The control aligns with the first line of a multi-line row. The cell shows a pointer cursor while it holds an enabled control.

Support sub-rows in `DataTable.RowExpandButton`. For a row with sub-rows, the accessible label is `Expand …` / `Collapse …`. The button sets `aria-controls` only when the row also renders a detail panel through `renderExpanded`. Previously it pointed `aria-controls` at a missing element.

When `DataTable.RowExpandButton` expands a row, its sub-rows and `DataTable.ExpandedRow` fade in and the rows below slide down, with a 200 ms strong ease-out. When it collapses a row, that content fades out while the rows below slide up over it, and a click during the collapse reverses it. The motion is off when the user prefers reduced motion.
