---
"@ngrok/mantle": patch
---

`CursorPagination.PageSizeSelect` names its combobox "Items per page" by default. Its visible text is only the current value, so a screen reader had no stable name for it. Pass `aria-label` to override the name. The dead `value` attribute on the trigger button is gone.

`useOffsetPagination`'s `goToLastPage` stays on page 1 for an empty list. It set the 1-indexed `currentPage` to 0 and the `offset` to a negative number.
