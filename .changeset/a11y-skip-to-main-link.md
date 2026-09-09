---
"@ngrok/mantle": patch
---

`SkipToMainLink` joins a `data-slot` you pass with its own `"skip-to-main-link"` instead of replacing it, like every other mantle part. The focus call no longer passes `preventScroll`, so a target below the fold scrolls into view when the link is activated and a sighted keyboard user sees where focus went.
