---
"@ngrok/mantle": patch
---

`mantle.css` holds the dark theme too, so an app loads one stylesheet. The resolved colors do not change, with one exception. When the `<html>` theme class and `data-applied-theme` disagree, the light rule now wins. Before, the stylesheet order decided: `<MantleStyleSheets />` before the app stylesheet gave light, and an `@import` of `mantle-dark.css` after `mantle.css` gave dark. `ThemeProvider` and `PreventWrongThemeFlashScript` keep the two in step, so this affects only a page whose writers get different `forceTheme` values.

**Deprecated:** `MantleStyleSheets` renders nothing, and `mantleStyleSheetUrls` returns the URLs you pass it. `@ngrok/mantle/mantle-dark.css` is an empty file. Delete `<MantleStyleSheets />`, the `mantleStyleSheetUrls` call, and every `mantle-dark.css` import, CSS `@import`, `<link>`, or preload. Existing code still compiles and renders correctly. A future minor release removes these exports.
