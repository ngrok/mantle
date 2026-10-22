---
"@ngrok/mantle": patch
---

Keep `Accordion.Trigger` the same size when its section opens. The trigger no longer moves 8px of its bottom padding to `Accordion.Body`, so the header and the gap to the content stay still while only `Accordion.Content` moves. `Accordion.Body` now has `pt-1`, which keeps the focus ring off the first line. The content height and opacity, and the caret, ease with the strong ease-out curve. The caret no longer turns when the user prefers reduced motion. Remove a `data-state-open:pb-4` override from `Accordion.Trigger`; it is now the default.
