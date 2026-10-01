---
"@ngrok/mantle": patch
---

`DescriptionList.Root` sizes its value column `minmax(0, 1fr)` instead of `1fr`. A bare `1fr` track has an `auto` minimum that resolves to the value's min-content width, so a long single-line value (a URL, an ID, a token) widened the column and the list scrolled sideways. An ellipsis never appeared, and each call site patched the column with `min-w-0` on `DescriptionList.Value`.

The column now shrinks to the room left beside the label. A `truncate` child clips with an ellipsis, and `wrap-anywhere` or `break-all` on the value or on a child wraps it, with no `min-w-0` on `DescriptionList.Value`. Remove a `min-w-0` you set on `DescriptionList.Value` for this reason; it is now redundant.

Content that cannot shrink and has no scroll container of its own (a wide table, a `pre`) now overflows its cell past the row stripe. `DescriptionList.Root` still scrolls to reveal it. Give that content `overflow-x-auto` to scroll it inside the row instead.

Docs: https://mantle.ngrok.com/components/data-display/description-list#long-values
