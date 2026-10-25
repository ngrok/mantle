---
"@ngrok/mantle": minor
---

`mantle.css` holds both themes. Each color token is one `light-dark()` pair, and the `color-scheme` of the page or of an `invert-theme` island selects the theme.

**Breaking:**

- `@ngrok/mantle/mantle-dark.css` is gone. Delete its `?url` import, its CSS `@import`, and the `mantle-dark-styles` `<link>` in a non-React `<head>`.
- `MantleStyleSheets`, `mantleStyleSheetUrls`, `MantleStyleSheetsProps`, and `MantleThemeCssUrls` are gone from `@ngrok/mantle/theme`. Delete `<MantleStyleSheets />` and its `mantleStyleSheetUrls` call. `PreventWrongThemeFlashScript` stays in `<head>`.
- `getComputedStyle(element).getPropertyValue("--color-…")` returns the `light-dark(…)` text, the same in both themes. Set the token as the `color` of an element and read `getComputedStyle(element).color` to get the resolved color.
- A palette stop set on a bare `:root` or in your own `@theme` applies in both themes. Write it as `light-dark(<light>, <dark>)` to keep the themes apart.
- Mantle needs Safari 17.5, Chrome 123, or Firefox 120.

The resolved colors do not change: every token resolves to the value it had in light, in dark, and in an `invert-theme` island. A consumer `@theme` palette override now reaches `invert-theme` islands, and Tailwind emits only the palette stops a build uses. Charts read each `light-dark()` token from the root's `color-scheme`, with no extra style recalculation.

The codemod deletes the imports, the element, and the call. Migration guide: https://mantle.ngrok.com/migrations/0012-light-dark-tokens-migration
