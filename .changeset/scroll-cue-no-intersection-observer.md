---
"@ngrok/mantle": patch
---

Floats, picker lists, and `OtpInput` work again in jsdom, which has no `IntersectionObserver`, `ResizeObserver`, `scrollIntoView`, or `CSS.supports`. `Select`, `Combobox`, `MultiSelect`, `DropdownMenu`, `Popover`, `Tooltip`, `HoverCard`, and `Command` threw when they opened. `DropdownMenu` threw on a keyboard open, and `OtpInput` threw on paste. Where an API is missing, a float places itself only on scroll and resize, and a list shows no edge cue.
