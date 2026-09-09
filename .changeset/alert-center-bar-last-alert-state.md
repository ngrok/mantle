---
"@ngrok/mantle": patch
---

`AlertCenter.Bar` now compiles under the React Compiler. It keeps the most recent top alert in React state instead of a ref it read during render; that ref read made the compiler skip the whole component. Nothing changes at runtime: when the alerts empty, the chrome keeps that alert's intent and `data-alert-id` until the exit slide completes.
