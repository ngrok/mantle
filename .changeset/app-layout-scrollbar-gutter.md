---
"@ngrok/mantle": patch
---

Keep space for the scrollbar in `AppLayout.Body` and `AppLayout.SidePanelBody` with `scrollbar-gutter-stable`. A page no longer moves sideways when it starts to overflow. This matches `Dialog.Body` and `Sheet.Body`. Browsers with overlay scrollbars, such as macOS by default, show no change.

`AppLayout.Body`, `AppLayout.SidePanelBody`, `Dialog.Body`, and `Sheet.Body` all set `scrollbar-gutter-stable`. If you pass `scrollbar-gutter-stable` in the `className` of one of these parts, remove it: it has no effect.
