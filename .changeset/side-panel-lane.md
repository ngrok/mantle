---
"@ngrok/mantle": patch
---

An open `AppLayout.SidePanel` now collapses an expanded `Sidebar.Root` in a window narrower than the lane your app sets in `@theme` with `--container-side-panel-lane`. Before, the collapse stayed at the default 56.5rem while the panel floated at your lane, so a wider lane left the sidebar and the panel out of step. `mantle.css` writes the resolved lane to a private `--_side-panel-lane` on `:root`, and the panel reads it once when it mounts.
