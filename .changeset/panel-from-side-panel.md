---
"@ngrok/mantle": minor
---

Add a preview `Panel` in `@ngrok/mantle/panel`: the look of `AppLayout.SidePanel` as a part of its own, so a surface outside the app shell can use the same presentation. `Panel.Root` renders an `<aside>` card (pass `asChild` for another element), `Panel.Header` is a toolbar row on the same band as `AppLayout.Header`, `Panel.Body` is the scroll region, and `Panel.Footer` is a bar pinned to the bottom. It has no open state. Each part stamps a `data-slot`: `panel`, `panel-header`, `panel-body`, and `panel-footer`. See the [Panel docs](https://mantle.ngrok.com/components/preview/panel).

`AppLayout.SidePanel`, `AppLayout.SidePanelHeader`, `AppLayout.SidePanelBody`, and `AppLayout.SidePanelFooter` now render the `Panel` parts. Their look and behavior do not change. The card inside `AppLayout.SidePanel`'s `<aside>` carries `data-slot="panel"`. The header, the body, and the footer keep their `app-layout-side-panel-*` slot and join the matching `panel-*` slot after it, as in `data-slot="app-layout-side-panel-header panel-header"`. A selector with `~=`, such as `[data-slot~=app-layout-side-panel-header]`, keeps matching. A selector that matches the whole attribute, such as `[data-slot="app-layout-side-panel-header"]`, no longer does: change it to `~=`.

The line under `AppLayout.Header`, `AppLayout.SidePanelHeader`, and `Panel.Header` now uses `border-separator` in place of `border-card-muted`, as the [Borders and dividers](https://mantle.ngrok.com/base/colors#borders-and-dividers) rule says for a divider. The card edges keep `border-card-muted`. Merge `border-card-muted` on the header to keep the old line.
