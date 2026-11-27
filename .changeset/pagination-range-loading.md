---
"@ngrok/mantle": patch
---

`PaginationRange` takes `isLoading`. While the rows load, the count line says "Loading", then the plural `noun`, such as "Loading domains…", and the root has `data-loading`. The same live region announces the count when `isLoading` turns off, so a loading table needs no second `role="status"` element. See https://mantle.ngrok.com/components/navigation/pagination#loading.
