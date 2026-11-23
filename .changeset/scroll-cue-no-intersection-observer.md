---
"@ngrok/mantle": patch
---

Floats, picker lists, and `OtpInput` work in jsdom, which has no `IntersectionObserver`, `ResizeObserver`, `scrollIntoView`, or `CSS.supports`. `Select`, `Combobox`, `MultiSelect`, `DropdownMenu`, `Popover`, `Tooltip`, and `HoverCard` threw when they opened, and the `Command` list threw when it rendered. `DropdownMenu` also threw on a keyboard open, and `OtpInput` threw on paste. Where an API is missing, a float places itself when it opens and on scroll and resize, and a list shows no edge cue.
