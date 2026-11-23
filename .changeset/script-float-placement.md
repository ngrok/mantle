---
"@ngrok/mantle": patch
---

Place `Popover`, `Tooltip`, `HoverCard`, and `DropdownMenu` from script in each browser, not with CSS anchor positioning. Chromium lays out an anchor-positioned element again on each frame of a transition on it, so each open fade cost about 12 layouts. Now an open costs one. The floats look and act the same.
