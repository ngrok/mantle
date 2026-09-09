---
"@ngrok/mantle": patch
---

`isInput` from `@ngrok/mantle/input` now returns `false` on the server. Before this change, a call with a non-null value in a loader, an action, or a render helper threw `ReferenceError: HTMLInputElement is not defined`, because Node declares no `HTMLInputElement`. In the browser nothing changes.
