---
"@ngrok/mantle": patch
---

`Tabs.Trigger` now renders `children` inside a `<span data-slot="tabs-trigger-label">`, on the plain path and the `asChild` path alike. The active-tab decoration is a permanent element sibling, so a bare text label was never a lone child: on a page a browser translation engine had translated, the removal React runs when the label changes shape or goes away raised `NotFoundError` and blanked the page. React removes the span instead. The span is `display: contents`, so the icon, the label, and `Tabs.Badge` stay flex items of the trigger and keep its `gap`.

**Migration.** An icon you pass as a child of a trigger is now a grandchild, so a `[&>svg]` class on the trigger no longer reaches it. The part's own default moved with it, from `[&>svg]:size-5` to `[&>[data-slot=tabs-trigger-label]>svg]:size-5`. Change a `[&>svg]:…` override of your own to `[&_svg]:…`, or put the class on the icon itself. Because the two selectors are different tailwind-merge conflict groups, an unchanged override no longer replaces the default: both classes ship, and yours matches nothing.

`tabs-trigger-label` is public API, and the docs page lists it beside `tabs-trigger`.
