---
"@ngrok/mantle": patch
---

`AppLayout.SidePanel` now floats over the card whenever the `AppLayout.Workspace` row is too narrow to hold the rail, the card, and the panel at full width, whatever the viewport is. Before, only `mobileBreakpoint` decided, so an expanded rail at a tablet width squeezed the page narrower than the panel beside it.

`AppLayout.Workspace` is the container named `app-layout-workspace`, and the threshold is the new `--container-side-panel-lane` theme token: `56.5rem`, the expanded rail (13rem), the card at the panel's floor (21rem), the panel (21rem), and the three gutters. Raise it in `@theme` for a wider rail or panel.
