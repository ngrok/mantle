---
"@ngrok/mantle": patch
---

`Sidebar.Trigger` and `AppLayout.SidePanelTrigger` now default to `size="sm"`, so they sit level with the other `size="sm"` ghost icon buttons in an `AppLayout.Header` row. Both parts take a `size` prop to change it, and `IconButton`'s `data-size` reflects the value. Pass `size="md"` to keep the old height.
