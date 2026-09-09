---
"@ngrok/mantle": patch
---

`useTheme` throws outside a `ThemeProvider`, as its JSDoc always claimed. Before this change the context was seeded with a `["system", () => null]` tuple, so a call outside the provider returned a setter that did nothing.
