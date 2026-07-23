---
"@ngrok/mantle": minor
---

Add the `AlertCenter` **preview** compound component (`@ngrok/mantle/alert-center`): a single, top-level
entry point for one-to-many account alerts and their upgrade CTAs, meant to replace a stack of independent
window banners with one severity-colored bar. Alerts are **authored as JSX**: each `AlertCenter.Item`
composes the normal `Alert` banner parts as children (real anchors, arbitrary content) and registers its
coordination facts (`id`, `intent`) with the renderless `AlertCenter.Root` — mount an item to
show it, unmount to dismiss. Ranking stays deterministic: a stable sort by severity (`danger` › `warning` ›
`important` › `info` › `success`), then arrival order within an intent (sticky per id, so a returning alert
resumes its position). `AlertCenter.Bar` is an always-visible, full-width strip that renders the top item's
children inline (icon, title, and its call-to-action) plus a `+N more` trigger, collapses to nothing when
empty (like `AppLayout.Notice`), redirects keyboard focus to the next control when a focused top alert is
dismissed, and claims no ARIA `banner` landmark (arrivals and re-ranks are announced by a persistent,
visually-hidden `role="status"` live region that `AlertCenter.Root` mounts). `AlertCenter.Content` expands
the remaining items inline as ranked, full-width banner rows. `AlertCenter.DismissIconButton` is the
per-item dismiss affordance — its presence in an item's children is what makes that alert dismissable. The
chrome around each item is stamped with `data-placement="bar" | "list"` and `data-alert-id` as documented
styling hooks. Also exports the `AlertCenterIntent`, `AlertCenterItemProps`, and `AlertCenterRootProps`
types. Docs: https://mantle.ngrok.com/components/preview/alert-center
