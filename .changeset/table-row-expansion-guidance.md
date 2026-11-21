---
"@ngrok/mantle": patch
---

`DataTable` and `Table` now say that row expansion is a `DataTable` feature. The `@useWhen` text, the `@siblings` boundaries, and the JSDoc of both name a detail panel (`DataTable.ExpandedRow`) and sub-rows (`getSubRows`), so an agent that reads `Table` switches to `DataTable` instead of building its own expandable rows.
