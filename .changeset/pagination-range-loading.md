---
"@ngrok/mantle": patch
---

`PaginationRange` takes `total={null}` while the count is not known, such as while the rows load, and a new `loadingLabel` prop with the text to show then, such as "Loading domains…". The same live region shows the label, then the count when the total is known, so a loading table needs no second `role="status"` element. A screen reader announces each change after mount, such as a refetch; text present at mount is not announced, so the first load is silent. `offset` and `pageSize` are still checked while `total` is `null`. See https://mantle.ngrok.com/components/navigation/pagination#loading.
