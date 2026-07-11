---
"@ngrok/mantle": patch
---

`Slot` now concatenates `data-slot` values in DOM order instead of letting the child clobber the composing parent's: the parent part's slot chain comes first, then the child's own (e.g. `data-slot="breadcrumb-item breadcrumb-page"`). Parts that join their incoming `data-slot` prop with their own slot name (Breadcrumb and CenteredLayout do, more to follow) accumulate the full chain through arbitrarily deep `asChild` composition.
