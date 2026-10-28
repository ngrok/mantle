---
"@ngrok/mantle": patch
---

`ThemeProvider` and `useInitialHtmlThemeProps` no longer throw in a sandboxed iframe that blocks cookies. In an iframe with `sandbox="allow-scripts"` and no `allow-same-origin`, a read of `document.cookie` throws a `SecurityError`. In such a frame, mantle now reads the theme from `ssrCookie`, so the client agrees with the server HTML. With no `ssrCookie`, it renders the default theme.
