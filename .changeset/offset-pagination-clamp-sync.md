---
"@ngrok/mantle": patch
---

Fix two `useOffsetPagination` gaps with a controlled `page`:

- Fix: with a controlled `page` and the hook's own page size, the render that applies a `setPageSize` change now returns `currentPage`, `pageSize`, `offset`, and `totalPages` for the new size. Before, that render clamped the new page with the old size. A parent that copies `currentPage` back to its own state then stored the wrong page: for 15 items, page 2 at 10 a page with `setPageSize(5)` landed on page 2 (items 6 to 10) instead of page 3 (items 11 to 15).
- Add `reportClampedPage`, off by default. Set it to `true` and the hook calls `onPageChange` with `currentPage` when a shorter list clamps the controlled `page`, so the stored page follows the clamp and a list that grows back stays on the page the reader saw. The hook reports each stored `page` once, and never while `listSize` is 0, so a list that loads does not erase the page in the URL. Without it, nothing changes: a parent that already writes the clamped page back keeps working.
