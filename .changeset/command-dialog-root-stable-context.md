---
"@ngrok/mantle": patch
---

`Command.DialogRoot` now reads `onOpenChange` through a ref, so the value `useCommandDialog()` returns keeps its identity across parent renders. Before this change, an inline `onOpenChange` arrow gave that value a new identity on every parent render. Every consumer of the hook, `Command.SearchTrigger` and `Command.Input` included, re-rendered with it. The callback you pass still runs on every open and close, and the latest one always wins.
