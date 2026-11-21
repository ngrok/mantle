---
"@ngrok/mantle": patch
---

The `Table` parts are now React Server Components. A server component renders `Table.Element`, `Table.Caption`, `Table.Head`, `Table.Body`, `Table.Foot`, `Table.Row`, `Table.Header`, and `Table.Cell` to HTML and sends no JavaScript for them to the browser. `Table.Root` sends only its overflow observer, which sets the `data-x-overflow`, `data-x-scroll-end`, and `data-sticky-active` attributes.

On a page that renders a static table in `Table.Root`, the browser gets 1.2 KB (gzip) of mantle JavaScript, where it got 11.7 KB before. A table without `Table.Root` sends no mantle JavaScript.

The props, refs, data attributes, and rendered HTML of each part do not change.
