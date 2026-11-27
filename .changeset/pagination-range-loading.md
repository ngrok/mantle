---
"@ngrok/mantle": patch
---

`PaginationRange` takes `total={null}` while the count is not known, such as while the rows load, and a new `loadingLabel` prop with the text to show then, such as "Loading domains…". The same live region shows the label, then the count when the total is known (or no text for an empty list), so a loading table needs no second `role="status"` element. A screen reader announces a change after mount, such as the first count or a refetch. A label present at mount is not announced. `offset` and `pageSize` are still checked while `total` is `null`. See https://mantle.ngrok.com/components/navigation/pagination#loading.
