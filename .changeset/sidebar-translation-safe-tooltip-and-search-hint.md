---
"@ngrok/mantle": patch
---

`Sidebar.Trigger`, `Sidebar.Tooltip`, and `Sidebar.SearchTrigger` no longer crash on a page a browser translation engine has translated. Both defects were the same shape: a `shortcut` crossing `null` changed the rendered node type, so React deleted the whole child list instead of appending. The translated label was reparented by then, and that removal raised `NotFoundError`, which tore down the React root and blanked the page.

The shared tooltip body always renders its `<span data-slot="sidebar-tooltip-row">` now, and only the chord chips are conditional, so a `shortcut` that resolves after the first paint appends beside an element. `Sidebar.SearchTrigger` branches on `asChild` rather than on `shortcut`, and its `<span data-slot="sidebar-search-trigger-shortcut">` is always mounted on the default `button` path. That span is `display: none` while it is empty, so a row with no chord keeps its layout and its flex `gap` exactly as before. Under `asChild` the span is absent, which keeps `Slot` at exactly one child.

Each part also wraps the content a consumer passes, because a mounted chord span leaves a bare text label with a sibling and crashes the consumer's own label swap. The tooltip body wraps `label` in a `<span data-slot="sidebar-tooltip-label">`, and `Sidebar.SearchTrigger` wraps `children` in a `<span data-slot="sidebar-search-trigger-label">` on the default `button` path. Both are `display: contents`, so neither adds a box. The chord chips carry `sidebar-tooltip-shortcut` and `sidebar-search-trigger-shortcut`. All five slots are public API, and the docs page lists each beside its part.

**Migration.** The leading icon in a `Sidebar.SearchTrigger` is now a grandchild on the default `button` path, so the part's own `[&>svg:first-child]` utilities gained a `[&>[data-slot=sidebar-search-trigger-label]>svg:first-child]` twin. Both forms ship, so a direct leading icon on the `asChild` path keeps its size and its colors exactly as before. Add the matching slot-scoped form to a `[&>svg]:…` override of your own, or it stops reaching the icon on the `button` path.
