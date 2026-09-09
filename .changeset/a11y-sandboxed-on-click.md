---
"@ngrok/mantle": patch
---

`SandboxedOnClick` with `asChild` no longer stamps `role="presentation"` on the child. A presentational role on a link or a button is an ARIA conflict that user agents ignore and audit tools flag. The default `<div>` keeps the role, and the child keeps its own.
