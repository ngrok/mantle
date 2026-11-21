---
"@ngrok/mantle": patch
---

`DataTable` and `Table` now say that row expansion is a `DataTable` feature. The `@useWhen` text and the `@siblings` boundaries of both name a detail panel and sub-rows. The `Table` JSDoc names `renderExpanded` and `getSubRows`. An agent that reads `Table` switches to `DataTable` instead of building its own expandable rows.
