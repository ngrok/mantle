---
"@ngrok/mantle": patch
---

`MultiSelect.Item` now renders `children` inside a `<div data-slot="multi-select-item-label">`. The selected-state check is a permanent element sibling, so a bare text label was never a lone child: on a page a browser translation engine had translated, the removal React runs when the label changes shape or goes away raised `NotFoundError` and blanked the page. The wrapper stays mounted, so a lone string label takes React's `textContent` path, which wipes the translation wrapper instead of removing a node the option no longer owns.

The wrapper is a `<div>` because a custom option layout is often a `MediaObject`, whose root is a `<div>` that a `<span>` may not contain. It is `display: contents`, so a child of your own stays a flex item of the option and any `flex-1` on it still resolves.

`multi-select-item-label` is public API, and the docs page lists it beside `multi-select-item`.
