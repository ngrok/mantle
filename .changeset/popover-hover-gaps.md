---
"@ngrok/mantle": patch
---

`Popover.Trigger` `openOnHover`: a hover open nested in another hover open keeps its parent open while the pointer crosses the gap between them. A hover open keeps focus off an `autofocus` field in the content. A `Popover.Close` that covers the trigger no longer lets the popover open again under a pointer that does not move.
