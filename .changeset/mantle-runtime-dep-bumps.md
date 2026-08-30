---
"@ngrok/mantle": patch
---

Bump runtime dependencies: `@ariakit/react` to 0.4.38.

The ariakit bump changes keyboard activation in mantle's ariakit-backed parts (`Combobox`, `MultiSelect`): the click that `Enter` or `Space` synthesizes on an item is now a `PointerEvent` with `pointerId: -1` and an empty `pointerType`, the same shape browsers dispatch for a click no pointer caused, so an `onClick` handler that reads `event.pointerType` or checks `instanceof PointerEvent` now sees the native shape.

It also fixes hover handling while the popup is closed: an item's hover no longer activates it or clears the active item, so a collapsed list no longer changes value or moves focus on a stray hover.
