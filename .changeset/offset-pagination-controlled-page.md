---
"@ngrok/mantle": patch
---

`useOffsetPagination` accepts `defaultPage`, a controlled `page` with `onPageChange`, and `resetPageOnListSizeChange`. Pass `page` and `onPageChange` to keep the page outside the hook, for example in the URL; the hook calls `onPageChange` with the next page and reads the page back from the prop. Set `resetPageOnListSizeChange: false` to stay on the current page when `listSize` changes: `currentPage` clamps to the new `totalPages` instead of returning to page 1, so a background refetch that changes the list length no longer moves the user. The default stays `true`. A `page` or `defaultPage` past the last page clamps to it.
