---
"@ngrok/mantle": patch
---

The native floats (`Popover`, `Tooltip`, `HoverCard`, and `DropdownMenu`) share a new `floating-surface` utility in `mantle.css` in place of a long class list in each component. A page with a float loads about 0.1 KB less JavaScript (gzip), and each open float has a shorter `class` attribute. A class that you pass in `className`, such as `z-60` or `overflow-auto`, still wins.
