---
"@ngrok/mantle": patch
---

`Query.Content` grows no taller than the room between the field and the viewport edge, as `Combobox`, `Select`, and `DropdownMenu` do. When the room is short, the popover scrolls. Before, a field near the bottom of the viewport pushed `Query.Footer` off screen, out of reach. The list now hides its scrollbar and fades an edge while rows sit past it, as the pickers do.

The `/` hint of `Query.Input keyboardShortcut` no longer shows on a device that can't hover, such as a phone, because it usually has no key to press. The shortcut and `aria-keyshortcuts` stay.
