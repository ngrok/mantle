---
"@ngrok/mantle": patch
---

`ThemeProvider` now takes an optional `ssrCookie` prop: the theme cookie pair from `extractThemeCookie` that `MantleStyleSheets` and `useInitialHtmlThemeProps` already accept. On the server, the provider seeds `useTheme` and `useAppliedTheme` from it, so the hydrated client renders the same markup as the server. Before this change the server always rendered `system`. A user with a stored theme then hit a hydration mismatch in every component that rendered from the theme on the server. On a dark-theme page, `AutoThemeIcon` kept the server's sun glyph after hydration. The client still reads `document.cookie`, so an omitted `ssrCookie` behaves as before. Pass the value from your root loader: `<ThemeProvider ssrCookie={loaderData?.ssrCookie}>`.
