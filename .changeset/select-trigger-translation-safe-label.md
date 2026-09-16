---
"@ngrok/mantle": patch
---

`Select.Trigger` now renders `children` inside a `<span data-slot="select-trigger-label">`. The caret is a permanent element sibling, so a bare text child was never a lone child: on a page a browser translation engine had translated, the removal React runs when that child changes shape or goes away raised `NotFoundError` and blanked the page. A trigger that renders `selected ? <span>{selected.label}</span> : "Select"` took that path on the first pick. React removes the span instead, and a lone string child moves onto React's `textContent` path, which wipes the translation wrapper.

The span is `display: contents`, so `Select.Value` stays a flex item of the trigger and keeps its `gap`.

**Migration.** `Select.Value` is now a grandchild of the trigger, so a `[&>span]` class on the trigger reaches the wrapper instead. The part's own defaults moved with it, from `[&>span]:line-clamp-1 [&>span]:text-left` to `[&>[data-slot=select-trigger-label]>span]:line-clamp-1` and `[&>[data-slot=select-trigger-label]>span]:text-left`. Change a `[&>span]:…` override of your own to the matching `[&>[data-slot=select-trigger-label]>span]:…`. That form shares the default's variant prefix, so tailwind-merge drops the default instead of shipping both. An unchanged `[&>span]:line-clamp-none` now lands on the wrapper: `line-clamp` sets `display`, which gives the wrapper a box and takes `Select.Value` out of the trigger's flex row.

`select-trigger-label` is public API, and the docs page lists it beside `select-trigger`.
