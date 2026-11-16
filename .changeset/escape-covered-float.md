---
"@ngrok/mantle": patch
---

A `Popover`, `DropdownMenu`, `Select`, `HoverCard`, or `Tooltip` outside a `Dialog`, `AlertDialog`, or `Sheet` paints under that overlay when it opens after the overlay. Escape from the overlay's content now closes the overlay, and the float stays open. Before, Escape closed the hidden float, and the overlay stayed open. A `Popover` that opens under an overlay also no longer moves focus out of the overlay. The overlay content's `onEscapeKeyDown` still runs first and can keep the overlay open.
