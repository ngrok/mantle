---
"@ngrok/mantle": patch
---

`ThemeProvider` and `useInitialHtmlThemeProps` no longer throw in a sandboxed iframe that blocks cookies. In an iframe with `sandbox="allow-scripts"` and no `allow-same-origin`, a read of `document.cookie` throws a `SecurityError`. Mantle now reads such a frame as having no theme cookie, so it renders the default theme.
