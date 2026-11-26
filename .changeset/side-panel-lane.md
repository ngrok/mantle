---
"@ngrok/mantle": patch
---

An open `AppLayout.SidePanel` now collapses an expanded `Sidebar.Root` when its `AppLayout.Workspace` row is narrower than the lane your app sets in `@theme` with `--container-side-panel-lane`. Before, the collapse read the window against a fixed 56.5rem while the panel floated at your lane, so a wider lane left the sidebar and the panel out of step. The collapse and the float now read the same container query, so they move together when the row resizes or a stylesheet loads late.
