---
"@ngrok/mantle": patch
---

`mantle.css` holds the dark theme too, so an app loads one stylesheet. The resolved colors do not change.

**Deprecated:** `MantleStyleSheets` renders nothing, and `mantleStyleSheetUrls` returns the URLs you pass it. `@ngrok/mantle/mantle-dark.css` is an empty file. Delete `<MantleStyleSheets />`, the `mantleStyleSheetUrls` call, and every `mantle-dark.css` import, CSS `@import`, `<link>`, or preload. Existing code still compiles and renders correctly. A future minor release removes these exports.
