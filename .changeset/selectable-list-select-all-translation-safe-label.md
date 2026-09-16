---
"@ngrok/mantle": patch
---

`SelectableList.SelectAll` now renders `children` inside a `<span data-slot="selectable-list-select-all-label">`. The checkbox is a permanent element sibling, so a bare text label was never a lone child: on a page a browser translation engine had translated, the removal React runs when a count-aware label swaps to an element raised `NotFoundError` and blanked the page.

The span is `display: contents`, so the checkbox and the label stay flex items of the header and keep its `gap`.

`selectable-list-select-all-label` is public API, and the docs page lists it beside `selectable-list-select-all`.
