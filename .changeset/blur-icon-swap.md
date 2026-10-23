---
"@ngrok/mantle": patch
---

Animate icon swaps. The outgoing icon fades, shrinks, and blurs out while the next icon comes into focus. A second swap during the motion reverses it from its current value. With reduced motion, the swap is instant.

- `Button` and `IconButton`: the `isLoading` spinner swaps with the `icon`.
- `CodeBlock.CopyButton` and the `Chart` copy buttons: the copy icon swaps with the check icon.
- `ThemeSwitcher.Trigger`: the icon swaps when the applied theme changes.

Each icon stays mounted, so the `Button` and `IconButton` icon is now inside a `<span data-slot="icon-swap">`, in a `<span data-slot="icon-swap-item">`. The item that shows has `data-state="active"`. The hidden items have `data-state="inactive"` and `aria-hidden="true"`. A `[&>svg]` selector on a button no longer reaches its icon; use `[&_svg]` instead.
