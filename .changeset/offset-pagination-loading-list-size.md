---
"@ngrok/mantle": minor
---

Breaking: `useOffsetPagination` takes `listSize: number | null`, and a `listSize` of `0` now means an empty list. `null` means the size is not known yet, such as while the list loads: the hook keeps the stored page, does not reset it, and does not call `onPageClamp`. `0` clamps like any other size, so `onPageClamp` reports page 1, and a list that empties and refills starts on page 1. Before, the hook read `0` as a list that loads and did not report the clamp. To migrate, pass `null` where a call passed `0` while its data loads, for example `data?.length ?? null` in place of `data?.length ?? 0`. Without this change, a call with `onPageClamp` rewrites a reload on page 4 to page 1 while its data loads. Leave a `0` that means an empty list. Migration guide: https://mantle.ngrok.com/migrations/offset-pagination-loading-list-size-migration
