---
"@ngrok/mantle": patch
---

`CursorPagination.Root` accepts a controlled `pageSize`. Pass it with `onChangePageSize` to own the page size yourself, for example in a URL search param, and `CursorPagination.PageSizeSelect` shows the value you pass. Before this change the select was uncontrolled and seeded once from `defaultPageSize`, so a page size that changed outside the component, such as a browser history move that rewrote the URL, never reached the select. `defaultPageSize` still works for the uncontrolled case; pass exactly one of the two. `onChangePageSize` on `Root` also runs in the uncontrolled case, so you can read the change without a callback on `PageSizeSelect`.

`CursorPagination.PageSizeSelect` now renders its trigger text, such as "50 per page", in the server HTML. Before this change Radix filled the trigger on the client after hydration, so the first paint showed an empty trigger.

The `DataTable` pagination recipe, in its JSDoc and on both docs pages, now passes the table's live page size as `pageSize`, so the select follows a `table.setPageSize()` call from anywhere.
