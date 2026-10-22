---
"@ngrok/mantle": patch
---

Add `DataTable.ControlCell`, a `<td>` for a row's expand toggle or selection checkbox. A click on its padding focuses and clicks the control, and no click in it reaches a clickable row. The control aligns with the first line of a multi-line row.

Support sub-rows in `DataTable.RowExpandButton`. For a row with sub-rows, the accessible label is `Expand …` / `Collapse …`. The button sets `aria-controls` only when the row also renders a detail panel through `renderExpanded`. Previously it pointed `aria-controls` at a missing element.
