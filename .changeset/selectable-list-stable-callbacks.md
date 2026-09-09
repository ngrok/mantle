---
"@ngrok/mantle": patch
---

`SelectableList.Root` no longer re-renders every mounted row when a parent render passes a new inline `onValueChange` or `onQueryChange`. Before this change, an inline callback (`onValueChange={(values) => form.setValue("keys", values)}`) rebuilt the list context on every parent render, so every row re-rendered even when `value`, `options`, and `query` were unchanged. `Root` still calls the latest `onValueChange` and `onQueryChange` you pass.
