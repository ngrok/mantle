---
"@ngrok/mantle": patch
---

Every part now joins an incoming `data-slot` ahead of its own instead of replacing it, the contract COMPONENT_SPEC.md §3.2 states and that `Sidebar`, `Tabs`, `Select`, and `AppLayout` already kept. A `data-slot` reaches a part two ways: mantle's `Slot` forwards an `asChild` ancestor's chain, and a wrapper passes its own name as a prop. The `Slot` path already joined. The prop path replaced one name with the other, so a wrapper's surface lost the inner part's slot: `Sidebar.Trigger`'s tooltip read `sidebar-trigger-tooltip` with no `tooltip-content`, `Sandbar.SaveButton` read `sandbar-save-button` with no `button`, and `DataTable.Root` read `data-table` with no `table`.

Each such surface now carries the chain in DOM order, ancestors first: `sidebar-trigger-tooltip tooltip-content`, `sandbar-save-button button`, `data-table table`, `alert-center-bar alert`, `icon svg-only`, and so on. Every part accepts `data-slot` in its props type through `WithDataSlot`, and each part's docs table shows the value it renders.

A selector on `[data-slot~="button"]` now reaches a `Sandbar.SaveButton`, and `[data-slot~="sandbar-save-button"]` still matches it. An exact `[data-slot="sandbar-save-button"]` match does not, and exact matching was never the documented way to target a slot. A Tailwind variant of the form `[&_[data-slot=x]]` is an exact match too: write `[&_[data-slot~=x]]`.
