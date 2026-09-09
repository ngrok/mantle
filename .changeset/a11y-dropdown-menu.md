---
"@ngrok/mantle": patch
---

`DropdownMenu.Shortcut` locks `translate="no"`, so a browser translation engine cannot rename a shortcut key; the prop is omitted from its type. The `DropdownMenu.SubTrigger` JSDoc and docs now say it opens on hover, ArrowRight, or Enter, not on focus.
