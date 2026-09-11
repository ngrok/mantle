---
"@ngrok/mantle": patch
---

Every `Select` part now joins a `data-slot` you pass ahead of its own slot instead of replacing it, so `<Select.Trigger data-slot="app-trigger">` renders `data-slot="app-trigger select-trigger"` and both hooks keep working.

The docs page and the JSDoc now list the data attributes each part stamps: `data-state`, `data-placeholder`, `data-disabled`, and `data-validation` on `Select.Trigger`; `data-state`, `data-side`, and `data-align` on `Select.Content`; and `data-state`, `data-highlighted`, and `data-disabled` on `Select.Item`. Every `Select.Root` prop carries a description.

`Select.Content` no longer animates when the user prefers reduced motion.
