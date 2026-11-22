---
"@ngrok/mantle": patch
---

`Table.Root` watches its overflow with one `ResizeObserver` and no `MutationObserver`. An edit to a cell that does not change the size of the table no longer makes the table read its layout. The `data-x-overflow`, `data-x-scroll-end`, and `data-sticky-active` attributes do not change.
