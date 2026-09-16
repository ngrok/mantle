---
"@ngrok/mantle": patch
---

`Tabs.Trigger` now renders `children` inside a `<span data-slot="tabs-trigger-label">`, on the plain path and the `asChild` path alike. The active-tab decoration is a permanent element sibling, so a bare text label was never a lone child: on a page a browser translation engine had translated, the removal React runs when the label changes shape or goes away raised `NotFoundError` and blanked the page. The span stays mounted, so a lone string label takes React's `textContent` path, which wipes the translation wrapper instead of removing a node the trigger no longer owns. The span is `display: contents`, so the icon, the label, and `Tabs.Badge` stay flex items of the trigger and keep its `gap`.

**Migration.** An icon you pass as a child of a trigger is now a grandchild, so a `[&>svg]` class on the trigger no longer reaches it. The part's own default moved with it, from `[&>svg]:size-5` to `[&>[data-slot=tabs-trigger-label]>svg]:size-5`. Change a `[&>svg]:…` override of your own to the matching `[&>[data-slot=tabs-trigger-label]>svg]:…`. That form shares the default's variant prefix, so tailwind-merge drops the default instead of shipping both. A `[&_svg]:…` class, or a class on the icon itself, is not enough: it also loses on specificity to the trigger's extra attribute selector. An unchanged `[&>svg]:…` override now matches nothing, and the default survives beside it.

`tabs-trigger-label` is public API, and the docs page lists it beside `tabs-trigger`.
