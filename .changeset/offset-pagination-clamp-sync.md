---
"@ngrok/mantle": patch
---

Fix two `useOffsetPagination` gaps with a controlled `page` or page size:

- Fix: the render that applies a `setPageSize` change now returns `currentPage`, `pageSize`, `offset`, and `totalPages` for the new size, when the parent owns either the page or the size. Before, that render mixed the new page with the old size. A parent that copies `currentPage` back to its own state then stored the wrong page: for 15 items, page 2 at 10 a page with `setPageSize(5)` landed on page 2 (items 6 to 10) instead of page 3 (items 11 to 15).
- Fix: a navigation call now cancels a `setPageSize` change that waits for the controlled `page`. Before, a later move to the page that the resize asked for applied its size.
- Add `onPageClamp(page)`, an opt-in callback. When a shorter list clamps the controlled `page`, the hook calls it with `currentPage`, so the stored page follows the clamp and a list that grows back stays on the page the reader saw. Write the page in place of the current history entry, such as with `setSearchParams(params, { replace: true })`: a new entry traps the back button. The hook does not call it while `listSize` is 0. Pair it with `resetPageOnListSizeChange: false` so a list that loads keeps the page in the URL. The hook also waits until the parent commits a page that the hook requested, and a list reset does not repeat a clamp to page 1. Without `onPageClamp`, the hook reports no clamp, and a parent that already writes the clamped page back keeps working.
