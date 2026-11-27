---
"@ngrok/mantle": patch
---

Fix how `useOffsetPagination` handles a page size change:

- A change to the `pageSize` prop no longer calls `onPageChange`. A parent that keeps `page` and `pageSize` in the URL now keeps the page that a back or forward move restores. Without `onPageSizeChange`, a `pageSize` change still moves the hook's own page to 1.
- Add `onPageSizeChange`. Pass it with `pageSize` to own the page size, as `page` with `onPageChange` owns the page.
- Behavior change: `setPageSize` no longer resets to page 1. It moves to the page that holds the first item of the current page, clamped to the last page, and calls `onPageSizeChange` and `onPageChange` together. For example, page 6 at 20 a page (items 101 to 120) becomes page 3 at 50 a page (items 101 to 150).
