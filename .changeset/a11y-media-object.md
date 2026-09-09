---
"@ngrok/mantle": patch
---

`MediaObject.Root`, `MediaObject.Media`, and `MediaObject.Content` now forward every `<div>` prop. Before this change they kept only `className`, `style`, `children`, and `ref`, so an `id`, an `aria-*` attribute, a `data-*` attribute, or an `onClick` was dropped in silence while the docs said "All props from div". A `data-slot` chain from an `asChild` ancestor joins ahead of each part's own slot name instead of replacing it.
