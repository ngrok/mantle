---
"@ngrok/mantle": patch
---

`Strata.Section` sizes its columns `minmax(0, 1fr) minmax(0, 2fr)` instead of `1fr 2fr`, and below `md` it sizes its one stacked track `minmax(0, 1fr)` instead of the implicit `auto`. A bare `1fr` track and an implicit track both have an `auto` minimum that resolves to the content's min-content width, so one nowrap value in `Strata.Body` (a URL, an ID, a token) widened the section past its container and the page scrolled sideways. Each call site patched both columns with `min-w-0`.

The tracks now shrink to the room the section has, at every width. A `truncate` child clips with an ellipsis, and `wrap-anywhere` or `break-all` wraps, with no `min-w-0` on `Strata.Header` or `Strata.Body`. Remove a `min-w-0` you set on either part for this reason; it is now redundant. The split is still one to two, and `--strata-columns` still re-splits it. Keep the `minmax(0, …)` form in an override: `--strata-columns: 1fr 1fr` brings the overflow back.

Docs: https://mantle.ngrok.com/components/structure/strata#column-split
