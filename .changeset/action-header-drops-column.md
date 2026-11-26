---
"@ngrok/mantle": patch
---

The 0002 codemod now drops the `column` prop when it rewrites an action column's header to `DataTable.ActionHeader`. Before, it kept `column={props.column}`, which `DataTable.ActionHeader` does not take, so the rewritten code failed typecheck.
