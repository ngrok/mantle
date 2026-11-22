---
"@ngrok/mantle": patch
---

Server code can now call mantle's plain helpers, such as `extractThemeCookie`, `getStoredTheme`, `getOffsetPaginatedSlice`, `parseValidation`, `selectAllChecked`, `breakpoints`, and the `OtpInput` `REGEXP_ONLY_*` patterns. Before this change, these helpers shipped in `"use client"` chunks, so a React Server Components host turned each one into a client reference that throws when a server component or a loader calls it. The import paths do not change.

The build now fails when a subpath exports a plain helper from a `"use client"` chunk. Helpers that read a browser-only API, such as `readThemeFromHtmlElement` and `makeToast`, stay client code. `@ngrok/mantle/button`, `dialog`, `sheet`, and `icons` also load on the server now; before, their Phosphor icon imports threw on load.
