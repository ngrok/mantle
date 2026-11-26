---
"@ngrok/mantle": patch
---

Add `presentation` to `Popover.Root`. With `"auto"`, a popover opens in a `Drawer` on a phone (a viewport below `sm` with a touch pointer) and as a popover elsewhere. It decides at each open. The drawer code loads after the popover mounts, and only on a phone. `Popover.Content` stamps `data-presentation`. A `Sandbar` slides away while a drawer is open.
