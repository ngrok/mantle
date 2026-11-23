---
"@ngrok/mantle": patch
---

The edge cue of `Select`, `Combobox`, `MultiSelect`, `DropdownMenu`, and `Command` no longer stays off in WebKit when the list gets its size after the first check, such as a menu that shows a frame after it mounts. Each resize of the list now checks both edges again.
