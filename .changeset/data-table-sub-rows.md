---
"@ngrok/mantle": patch
---

Support sub-rows in `DataTable.RowExpandButton`. For a row with sub-rows, the accessible label is `Expand …` / `Collapse …`, and the button sets no `aria-controls`, because no detail row exists. Previously it pointed `aria-controls` at a missing element. The docs show a sub-rows example.
