---
"@ngrok/mantle": patch
---

`Select`, `Combobox`, `MultiSelect`, `DropdownMenu`, `Popover`, `Tooltip`, and `HoverCard` show their content in jsdom again, as in 0.94.1. A test can find the options, menu items, and dialog by their roles. In a browser with no popover API, the content no longer has a `popover` attribute: jsdom hides each `[popover]` that is not open, and it has no `showPopover`.
