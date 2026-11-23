---
"@ngrok/mantle": patch
---

`Popover`, `Tooltip`, `HoverCard`, and `DropdownMenu`: when the content fits on neither side of its trigger, it now opens on the side with more room, as it did with Radix in 0.94.1. Before, it stayed on its preferred side, and a menu near the bottom of a short window was capped to the small room below its trigger.
