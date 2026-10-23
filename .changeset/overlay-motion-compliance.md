---
"@ngrok/mantle": patch
---

Align component motion with the mantle motion rules.

- `Popover`, `Tooltip`, `HoverCard`, `DropdownMenu`, `Select`, `Dialog`, `AlertDialog`, and `Sheet` now enter in 200ms and exit in 150ms on the `ease-out-strong` curve. Under `prefers-reduced-motion`, they open and close without animation.
- `Dialog`, `AlertDialog`, and `Sheet` play their exit animation again. Since 0.83.8, they unmounted at once on close.
- Floating content (`Popover`, `Tooltip`, `HoverCard`, `DropdownMenu`, and `Select`) now slides 4px instead of 8px. It slides back on exit, so the exit mirrors the enter.
- `Sandbar` now enters in 200ms instead of 400ms and exits in 150ms on `ease-out-strong`. Its blocked-navigation shake now moves 4px in 300ms, the same as the form-control error shake.
- The `MultiSelect` tag shake now settles like the form-control error shake.
- The `Switch` thumb, the `ProgressBar` indicator, and the `Alert`, `CodeBlock`, and `SplitButton` carets now move in 200ms on `ease-out-strong`, and stay still under `prefers-reduced-motion`.
- The `PasswordInput` visibility icon now opens from half height on `ease-out-strong`.
