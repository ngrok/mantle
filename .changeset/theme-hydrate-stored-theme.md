---
"@ngrok/mantle": patch
---

`useTheme` and `useAppliedTheme` no longer cause a hydration mismatch on a page rendered without `ssrCookie`, such as a prerendered page. During hydration, both return the theme the server rendered. The next render returns the stored theme from the cookie.
