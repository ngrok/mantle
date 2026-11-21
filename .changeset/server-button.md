---
"@ngrok/mantle": patch
---

`Button`, `IconButton`, and `ButtonGroup` are now React Server Components. A server component renders them to HTML and sends no JavaScript for them to the browser. Their props and refs do not change.

`Button` and `IconButton` with `asChild` still send JavaScript: a small client component renders their `Slot`, so a client trigger such as `Dialog.Trigger asChild` still reaches the child, and it cancels a click on a disabled child. A page that uses `asChild` gets about 10 KB (gzip), most of it `Slot` and `cx`. Before, each `Button` sent about 14.5 KB (gzip).

An enabled `Button` or `IconButton` now renders no `aria-disabled` attribute, where it rendered `aria-disabled="false"`. The value means the same to assistive technology. A server component renders the button before a client trigger merges its props, and an explicit `false` would beat a trigger's `disabled`.

A client bundle of `@ngrok/mantle/button` is about 1.8 KB (gzip) smaller.
