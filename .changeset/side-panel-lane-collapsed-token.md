---
"@ngrok/mantle": minor
---

Rename the theme token `--container-side-panel-lane-icon-rail` to `--container-side-panel-lane-collapsed`. The default (`46.75rem`) and the job are the same: the narrowest `AppLayout.Workspace` row that holds a collapsed sidebar, the page, and an `AppLayout.SidePanel`. The Tailwind container variants change name with it: `@min-side-panel-lane-icon-rail` and `@max-side-panel-lane-icon-rail` are now `@min-side-panel-lane-collapsed` and `@max-side-panel-lane-collapsed`.

To migrate, replace `side-panel-lane-icon-rail` with `side-panel-lane-collapsed` in your CSS and your class strings. An app that never set the token changes nothing. See the [migration guide](https://mantle.ngrok.com/migrations/0016-side-panel-lane-collapsed-migration).

The docs and the JSDoc no longer say "rail" or "icon rail". The sidebar is "collapsed" or "expanded", the words that `data-state` on `Sidebar.Nav` uses.
