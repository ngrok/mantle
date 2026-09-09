---
"@ngrok/mantle": patch
---

`SkipToMainLink` joins a `data-slot` you pass with its own `"skip-to-main-link"` instead of replacing it, like every other mantle part. The docs now state that the focus call does not scroll, so the target must sit near the top of the viewport.
