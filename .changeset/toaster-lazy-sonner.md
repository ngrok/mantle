---
"@ngrok/mantle": patch
---

`Toaster` no longer puts sonner on a page's critical path. The toast code loads in its own chunk when the browser is idle after hydration, or on the first `makeToast` call if that comes first. In a Vite build of a page with `ThemeProvider`, `Button`, `Toaster`, and one `makeToast` call, the toast code adds 3.1 KB gzip to the entry chunk instead of 12.0 KB. `Toaster` also no longer reads the theme, so a theme change does not render it again.

A toast made before the chunk loads waits for it, and the waiting toasts show in call order. This includes a toast made before hydration. If the chunk fails to load, the page keeps working, `reportError` reports the error, and the next `makeToast` call tries the load again. A browser that caches failed module fetches fails that retry too. The notifications landmark is in the page from hydration on, as before, and the Alt+T shortcut does not change.

`makeToast` still returns the toast's ID. When you pass no `id`, the ID is now a negative number that mantle makes, unique on the page, not a positive number from sonner.
