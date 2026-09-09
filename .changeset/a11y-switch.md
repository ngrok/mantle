---
"@ngrok/mantle": patch
---

A click on a read-only `Switch` now reaches ancestor click handlers. The guard still calls `preventDefault`, which Radix reads to skip the toggle, but no longer calls `stopPropagation`, so a clickable row around a read-only switch gets its click.
