---
"@ngrok/mantle": patch
---

`Label` stamps `data-disabled` instead of `aria-disabled` for its disabled style. A `<label>` has no role that supports `aria-disabled`, so the attribute conveyed nothing to assistive technology. Style the disabled state with `data-disabled:`; the old `aria-disabled:` hook no longer matches.
