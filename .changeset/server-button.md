---
"@ngrok/mantle": patch
---

`Button`, `IconButton`, and `ButtonGroup` are now React Server Components. A server component renders them to HTML and sends no JavaScript for them to the browser. Their props, refs, and rendered HTML do not change.

One case still ships JavaScript: a disabled or loading `Button` or `IconButton` with `asChild`. A small client component cancels a click on that child, so a disabled link does not navigate. It sends about 0.3 KB (gzip) to the browser, where each `Button` sent about 14.5 KB (gzip) before.

A click on a disabled `asChild` child is now cancelled before any React handler runs, as a click on a disabled native `<button>` is. The `onClickCapture` handlers of the child's ancestors no longer see it.

A client bundle of `@ngrok/mantle/button` is about 1.7 KB (gzip) smaller.
