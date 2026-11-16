---
"@ngrok/mantle": patch
---

`ThemeProvider` keeps the server HTML of a `Suspense` boundary that is still loading after hydration. Before, when the stored theme was not the server theme, the provider changed the theme after hydration in a context update. React then removed the server HTML of each boundary that was not hydrated, and mounted its content again. The provider now keeps the theme in a store, so a theme change re-renders only the hydrated components that read the theme.
