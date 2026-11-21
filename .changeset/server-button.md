---
"@ngrok/mantle": patch
---

`Button`, `IconButton`, and `ButtonGroup` are now React Server Components. A server component renders them to HTML and sends no JavaScript for them to the browser. Their props, refs, and rendered HTML do not change.

`Button` and `IconButton` with `asChild` send about 0.2 KB (gzip) of JavaScript: a small client component that cancels a click on a disabled child, so a disabled link does not navigate. Before, each `Button` sent about 14.5 KB (gzip).

A client bundle of `@ngrok/mantle/button` is about 1.8 KB (gzip) smaller.
