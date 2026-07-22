---
"@ngrok/mantle": minor
---

Add the `AlertCenter` **preview** compound component (`@ngrok/mantle/alert-center`): a single, top-level
entry point for one-to-many account alerts and their upgrade CTAs, meant to replace a stack of independent
window banners with one severity-colored bar. `AlertCenter.Root` is the state + data owner (renderless
beyond the underlying `Dialog.Root`); it takes the alerts as **data** and derives the count, the
highest-severity "top" alert, and the ranked ordering — a stable sort by severity (`danger` › `warning` ›
`important` › `info` › `success`) — so aggregation is deterministic rather than dependent on mount order.
`AlertCenter.Bar` is an always-visible, full-width strip that surfaces the top alert inline (icon, title,
and its call-to-action) plus a `+N more` trigger, collapses to nothing when empty (like `AppLayout.Notice`),
and claims no ARIA `banner` landmark (arrivals and re-ranks are announced by a persistent, visually-hidden
`role="status"` live region that `AlertCenter.Root` mounts). `AlertCenter.Content` opens a modal
`Dialog` listing every alert (ranked, scrollable, each with its CTA and optional dismiss), and accepts a
render-prop child so row rendering stays fully composable. Compose it into an application shell as a child
of `AppLayout.Root`, between `AppLayout.Notice` and `AppLayout.Body`. Also exports the `AlertCenterAlert`,
`AlertCenterAction`, `AlertCenterIntent`, and `AlertCenterRootProps` types. Docs:
https://mantle.ngrok.com/components/preview/alert-center
