---
"@ngrok/mantle": minor
---

Add a preview `Panel` in `@ngrok/mantle/panel`: the look of `AppLayout.SidePanel` as a part of its own, so a surface outside the app shell can use the same presentation. `Panel.Root` renders an `<aside>` card (pass `asChild` for another element), `Panel.Header` is a toolbar row on the same band as `AppLayout.Header`, `Panel.Body` is the scroll region, and `Panel.Footer` is a bar pinned to the bottom. It has no open state. Each part stamps a `data-slot`: `panel`, `panel-header`, `panel-body`, and `panel-footer`. See the [Panel docs](https://mantle.ngrok.com/components/preview/panel).

`AppLayout.SidePanel`, `AppLayout.SidePanelHeader`, `AppLayout.SidePanelBody`, and `AppLayout.SidePanelFooter` now render the `Panel` parts. Their look and behavior do not change. Each keeps its `app-layout-side-panel-*` slot and now also carries the matching `panel-*` slot, so `[data-slot~=app-layout-side-panel-header]` and `[data-slot~=panel-header]` both select the header.
