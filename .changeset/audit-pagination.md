---
"@ngrok/mantle": patch
---

Refine Pagination JSDoc and documentation (component audit): correct `@see` links, complete examples, and align Composition trees.

Also drop the `asChild` prop from `CursorPagination.PageSizeValue`. It never worked — `PageSizeValue` hard-codes its `{pageSize} per page` text as children, which overrode the composed child and made `Slot` throw `React.Children.only`. It now always renders a `span`.
