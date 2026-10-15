---
"@ngrok/mantle": patch
---

`Strata.Section` sizes its columns `minmax(0, 1fr) minmax(0, 2fr)` instead of `1fr 2fr`. A bare `1fr` track has an `auto` minimum that resolves to its content's min-content width, so one nowrap value in `Strata.Body` (a URL, an ID, a token) widened the section past its container and the page scrolled sideways. Each call site patched both columns with `min-w-0`.

The tracks now shrink to the room the section has. A `truncate` child clips with an ellipsis, and `wrap-anywhere` or `break-all` wraps, with no `min-w-0` on `Strata.Header` or `Strata.Body`. Remove a `min-w-0` you set on either part for this reason; it is now redundant. The split is still one to two, and `--strata-columns` still re-splits it.

Docs: https://mantle.ngrok.com/components/structure/strata#column-split
