---
"@ngrok/mantle": patch
---

Keep `Tab` inside an open `Popover`, as in 0.94.1. `Tab` on the last tab stop of `Popover.Content` moves focus to the first one, and `Shift+Tab` on the first moves focus to the last. The native content portals to the end of the body, so without this wrap `Tab` moved focus out of the page and left the popover open. Between the first and last stops, the browser moves focus, so a shadow root in the content keeps its own order. A `Dialog` opened from the content keeps its own `Tab` order. `Field.HelpContent` is a `Popover.Content` and wraps the same way.
