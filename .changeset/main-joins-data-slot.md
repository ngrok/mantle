---
"@ngrok/mantle": patch
---

`Main` now joins an incoming `data-slot` chain ahead of its own `"main"` slot name (previously the chain was
clobbered), so it composes cleanly as an `asChild` child of layout parts
(e.g. `<AppLayout.Content asChild><Main>…</Main></AppLayout.Content>`).
