---
"@ngrok/mantle": patch
---

`AppLayout.SidePanel` now floats over the card whenever the `AppLayout.Workspace` row is too narrow to hold the rail, the card, and the panel at full width, whatever the viewport is. Before, only `mobileBreakpoint` decided, so an expanded rail at a tablet width squeezed the page narrower than the panel beside it.

`AppLayout.Workspace` is the container named `app-layout-workspace`, and the threshold follows the rail beside the card, read through `:has()` on `Sidebar.Nav`'s `data-slot` and `data-state`:

- `--container-side-panel-lane` (`56.5rem`: the expanded rail at 13rem, the card at the panel's floor of 21rem, the panel at 21rem, and the three gutters) while a direct child of the row is an expanded `Sidebar.Nav`.
- `--container-side-panel-lane-icon-rail` (`46.75rem`: the same row with the icon rail at 3.25rem) with a collapsed rail, no rail, or a rail that is a sheet.

So collapsing the rail at a tablet width returns the panel to the lane beside the page. Raise either token in `@theme` for a wider rail or panel.

The panel's widths now read the row, not the viewport. The default `--app-layout-side-panel-width` is `clamp(21rem, 24cqw, 27rem)`, a quarter of the row, so a row that `--app-layout-max-width` caps on a wide screen holds the panel at its 21rem floor and the page keeps the rest. Before, `24vw` of a 1920px viewport put a 27rem panel beside a page narrower than the panel. The floating strip is `min(24rem, 100cqw - 5rem)`, so a row narrower than the strip never holds a panel wider than itself.
