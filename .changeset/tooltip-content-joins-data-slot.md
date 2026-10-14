---
"@ngrok/mantle": patch
---

`Tooltip.Content` joins a composing part's `data-slot` ahead of its own instead of replacing it, the way every other part does. The surfaces that wrap it now carry both names: `Sidebar.Trigger`'s tooltip is `data-slot="sidebar-trigger-tooltip tooltip-content"` and `Sidebar.Tooltip`'s is `data-slot="sidebar-tooltip tooltip-content"`, so a selector on `[data-slot~="tooltip-content"]` reaches them too. A selector on `[data-slot~="sidebar-trigger-tooltip"]` still matches. An exact `[data-slot="sidebar-trigger-tooltip"]` match does not, and exact matching was never the documented way to target a slot.
