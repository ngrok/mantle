---
"@ngrok/mantle": minor
---

`AlertCenter` shows the top alert in the server HTML, so hydration no longer shifts the page. Each `AlertCenter.Item` now renders its children on the server in a copy of the bar, and at hydration the client bar replaces the copy at the same height, with no enter animation.

This works only when the items exist during the server render. Prefetch the data your items read, such as your notifications query, in the root loader. Without the prefetch, the server has no items, and the bar still enters after hydration and pushes the page down. The items must also follow `AlertCenter.Bar` in the same parent.

Breaking: item children now render on the server and in the hydration pass. Before, they rendered only in the browser. Render an item only after `useIsHydrated()` returns `true` when its children read browser-only state during render, or when only the browser can decide it, such as an alert hidden by a dismissal in `sessionStorage`. `AlertCenter.Bar` and `AlertCenter.Content` also render a hidden anchor while they show nothing, so a test that expects an empty notice slot must ignore hidden elements. Migration guide: https://mantle.ngrok.com/migrations/0022-alert-center-server-render-migration
