---
"@ngrok/mantle": patch
---

Close `Popover`, `DropdownMenu`, and the other floats when an outside press ends, as a native `popover="auto"` does.

- A touch scroll that starts outside a float no longer closes it. A press that ends in the float keeps it open.
- A right click or Control click still closes the float when it starts.
- `onPointerDownOutside` and `onInteractOutside` still run when the press starts. The focus move of that press no longer calls `onFocusOutside` or `onInteractOutside` a second time.
- A controlled `DropdownMenu` that refuses to close keeps the click of the outside press, and the next outside press asks it to close again.
