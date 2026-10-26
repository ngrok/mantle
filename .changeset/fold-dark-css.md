---
"@ngrok/mantle": minor
---

`mantle.css` holds the dark theme too, so an app loads one stylesheet.

Each page makes one fewer render-blocking stylesheet request. The CSS is also smaller over the wire, because the two themes compress as one file. With every mantle class in the build, minified, the CSS goes from 41.0 KB to 38.4 KB with gzip (−6.6%), and from 29.9 KB to 27.6 KB with Brotli (−7.4%).

**Breaking:**

- `@ngrok/mantle/mantle-dark.css` is gone. Delete its `?url` import and every use of the URL, its CSS `@import`, and the `mantle-dark-styles` `<link>` in a non-React `<head>`.
- `MantleStyleSheets`, `mantleStyleSheetUrls`, `MantleStyleSheetsProps`, and `MantleThemeCssUrls` are gone from `@ngrok/mantle/theme`. Delete `<MantleStyleSheets />` and its `mantleStyleSheetUrls` call. `PreventWrongThemeFlashScript` stays in `<head>`.

The resolved colors do not change, with one exception. When the `<html>` theme class and `data-applied-theme` disagree, the light rule now wins. Before, the stylesheet order decided. `ThemeProvider` and `PreventWrongThemeFlashScript` keep the two in step, so this affects only a page whose writers get different `forceTheme` values.

The codemod deletes the imports, the element, and the call. Migration guide: https://mantle.ngrok.com/migrations/0012-single-stylesheet-migration
