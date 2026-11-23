---
"@ngrok/mantle": patch
---

Mantle no longer ships React Compiler output by default. A component or hook ships compiled only when it starts with `"use memo"` and a browser benchmark shows a better Interaction to Next Paint (INP). Today none does. Every component still passes the compiler's strict validations.

Against a build that compiles every component with a hook, all of mantle's JavaScript is 69.6 KB (gzip, 22%) smaller, a page loads 6 to 13 KB gzip less, and its heap is up to 5% smaller. At 4× CPU, MultiSelect and Combobox typing, charts, and `DataTable` respond as fast as the compiled build, and Select responds faster. A file with no `"use client"`, such as `Card`, builds to a chunk with no `"use client"`, so a server component can render it.

Four parts now keep a stable ref callback without the compiler, so a callback ref that you pass runs once, not on each re-render:

- `Select.Trigger` and `Select.Root`
- `MultiSelect.Content`, `Combobox.Content`, and `Select.Content`, which no longer place the popup again on each keystroke
- every part that renders through `Slot` (`asChild`)
