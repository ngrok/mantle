---
"@ngrok/mantle": minor
---

Remove the `stone` palette and theme duplication from `mantle.css`, so every page ships less render-blocking CSS. No app at ngrok used `stone`. See the [migration guide](https://mantle.ngrok.com/migrations/0017-stone-palette-migration).

- `stone` classes, such as `bg-stone-500`, make no CSS. Use `gray`.
- `gray` is an alias of `neutral` in both themes, and the 41 tokens with one value in both themes are declared once, on `:root` and on `invert-theme` islands. No resolved color changes. A `:root` override of one of those tokens now applies in the dark theme too.
- The theme rules no longer declare `--divide-color-card` and `--divide-color-card-muted`, which nothing read.

A marketing page without an island drops from 113.9 KB to 102.0 KB minified (18.4 KB to 17.9 KB gzipped). The [decision doc](https://github.com/ngrok/mantle/blob/main/decisions/2026-11-21-trim-unused-palettes.md) catalogs each removed value, so a palette can come back.
