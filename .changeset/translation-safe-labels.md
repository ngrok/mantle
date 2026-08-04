---
"@ngrok/mantle": patch
---

Fix a crash on browser-translated pages. `Button` threw `DOMException: Failed to execute 'insertBefore' on 'Node'` the moment `isLoading` turned on, which tore down the React root and blanked the page. `Badge`, `Anchor`, `DataTable.HeaderSortButton`, and `DataTable.ActionHeader` shared the same failure.

Google Translate wraps each text node in a `<font>` element, which reparents the original node: React's reference to it stays alive, but its parent is now the `<font>`. An `insertBefore` aimed at that node then names a child its parent no longer owns, and the DOM raises `NotFoundError`. Every affected component rendered a conditional element immediately before bare `children`, so the first click of any submit button threw before the loading spinner could render.

`Button`, `Badge`, and `Anchor` now render `children` inside a span carrying a new `data-slot` — `button-label`, `badge-label`, and `anchor-label`. Each one is public API: target it to style the label, for example with `min-w-0 truncate` to clamp a long one. `DataTable.HeaderSortButton` keeps its screen-reader sort announcer mounted at all times, and `DataTable.ActionHeader` renders its sticky-column indicator after `children`.

One layout note. The label is a single flex item, so `Button`'s and `Badge`'s `gap` falls between the icon slot and the label, never between two `children`. A call site that passed an icon as a child instead of through `icon` loses that gap, and `<Button icon={<PlusIcon />}>Create endpoint</Button>` is the intended shape. A call site that keeps a trailing hint as a child owns its own spacing.
