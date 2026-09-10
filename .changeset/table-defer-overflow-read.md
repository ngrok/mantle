---
"@ngrok/mantle": patch
---

`Table.Root` no longer forces a layout inside React's commit. Its overflow observer used to read `scrollWidth`
in a layout effect on mount, which laid out the whole table before React could finish the commit. The first
read now runs in the `ResizeObserver` callback, after the browser's own layout, and a `flushSync` there keeps
`data-x-overflow`, `data-x-scroll-end`, and `data-sticky-active` on the first painted frame. On a 1,000-row
`DataTable` the mount commit drops from about 31 ms to 14 ms, and from about 344 ms to 142 ms at 10,000 rows.
Time to first paint is unchanged, because the browser lays out the table either way.
