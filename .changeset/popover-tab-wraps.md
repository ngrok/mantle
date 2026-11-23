---
"@ngrok/mantle": patch
---

Keep `Tab` inside an open `Popover`, as in 0.94.1. `Tab` on the last control of `Popover.Content` moves focus to its first control, and `Shift+Tab` on the first control moves focus to the last. The native content portals to the end of the body, so without this wrap `Tab` moved focus out of the page and left the popover open. `Field.HelpContent` is a `Popover.Content` and wraps the same way.
