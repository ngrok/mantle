---
"@ngrok/mantle": patch
---

`Tooltip.Content` no longer advertises `asChild` in its props type. The content renders its own arrow next to `children`, so a slot always threw at runtime. `Tooltip.Root` no longer stamps a `data-slot`, because the Radix root renders no DOM for it to land on.
