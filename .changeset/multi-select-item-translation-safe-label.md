---
"@ngrok/mantle": patch
---

`MultiSelect.Item` now renders `children` inside a `<span data-slot="multi-select-item-label">`. The selected-state check is a permanent element sibling, so a bare text label was never a lone child: on a page a browser translation engine had translated, the removal React runs when the label changes shape or goes away raised `NotFoundError` and blanked the page. React removes the span instead, and a lone string label moves onto React's `textContent` path.

The span is `display: contents`, so a child of your own stays a flex item of the option and any `flex-1` on it still resolves.

`multi-select-item-label` is public API, and the docs page lists it beside `multi-select-item`.
