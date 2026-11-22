---
"@ngrok/mantle": patch
---

`Toaster` no longer puts sonner on a page's critical path. The toast code loads in its own chunk when the browser is idle after hydration, or on the first `makeToast` call if that comes first. In a Vite build of a page with `Toaster` and `makeToast`, this moves about 7.8 KB gzip of JavaScript out of the entry chunk.

A toast made before the chunk loads waits for it, and the waiting toasts show in call order. This includes a toast made before hydration. If the chunk fails to load, the page keeps working, and the next `makeToast` call loads the chunk again. The notifications landmark and the Alt+T shortcut do not change.

`makeToast` still returns the toast's ID. When you pass no `id`, the ID is now a string that mantle makes, not a number from sonner.
