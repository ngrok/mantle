---
"@ngrok/mantle": patch
---

`ThemeProvider` keeps the server HTML of a `Suspense` boundary that is still loading after hydration. Before, when the stored theme was not the server theme, the provider changed the theme after hydration in a sync update. React then removed the server HTML of each boundary that was not hydrated, and mounted its content again. The provider now changes the theme in a transition, so React hydrates those boundaries first.
