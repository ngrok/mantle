---
"@ngrok/mantle": minor
---

Remove the `stone` palette and theme duplication from `mantle.css`, so every page ships less render-blocking CSS. No app at ngrok used `stone`. See the [migration guide](https://mantle.ngrok.com/migrations/0017-stone-palette-migration).

- `stone` classes, such as `bg-stone-500`, make no CSS. Use `gray`.
- `gray` is an alias of `neutral` in both themes, and the 41 tokens with one value in both themes are declared once, on `:root` and on `invert-theme` islands. No resolved color changes for an app that does not override them.
- Your overrides can now win where they lost before: a later `:root { … }` override of a moved token applies in every theme, also on a page with an explicit or forced theme; a later `.invert-theme { … }` override applies on every island; and an `@theme` override of `--color-gray-*` takes effect.
- The theme rules no longer declare `--divide-color-card` and `--divide-color-card-muted`. Read `--border-color-card` and `--border-color-card-muted` instead; the `divide-card` classes keep working.

A marketing page without an island drops from 113.9 KB to 102.2 KB minified (18.4 KB to 18.0 KB gzipped). The [decision doc](https://github.com/ngrok/mantle/blob/main/decisions/2026-11-21-trim-unused-palettes.md) catalogs each removed value, so a palette can come back.
