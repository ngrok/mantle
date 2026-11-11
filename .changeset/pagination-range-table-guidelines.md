---
"@ngrok/mantle": patch
---

Add `PaginationRange` to `@ngrok/mantle/pagination`: the count line beside a paginated list or table, such as "1–20 of 2,396 domains".

- It takes `offset`, `pageSize`, and `total`, so it works with `useOffsetPagination` beside a `Table` (`offset`) and with a TanStack table instance beside a `DataTable` (`pageIndex * pageSize` and `getRowCount()`).
- It renders a `role="status"` live region, so a screen reader announces the new range when the page changes. The element stays in the DOM while the list is empty.
- It shows the total alone when one page holds every row, and no text for an empty list. `noun` sets the counted noun in both forms, and defaults to "result" and "results".
- It carries `data-slot="pagination-range"` and takes `asChild`.

The `Table` and `DataTable` JSDoc now carry large-list guidelines (paginate past 100 rows, search the whole list, paginate before you virtualize) and a pagination example with `CursorPagination` and `PaginationRange`.

https://mantle.ngrok.com/components/navigation/pagination#paginationrange
