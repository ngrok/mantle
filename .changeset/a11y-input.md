---
"@ngrok/mantle": patch
---

`Input` no longer stamps `data-disabled="false"` when it receives `aria-disabled="false"`. The `data-disabled:` variant matches attribute presence, so the stray value dimmed an enabled control.
