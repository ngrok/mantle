---
"@ngrok/mantle": patch
---

The `Kbd` docs and JSDoc no longer recommend `aria-label` on the `<Kbd>`. The `<kbd>` element has the `generic` role, which prohibits naming, so a screen reader does not read that label reliably and audit tools flag it. Every example now names a symbol key with a visually hidden label inside the `<Kbd>` and marks the glyph `aria-hidden`.
