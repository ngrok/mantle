---
"@ngrok/mantle": patch
---

Escape now closes the `Dialog`, `AlertDialog`, or `Sheet` that has focus when a float outside it opened later. Before, Escape closed that float out of sight under the overlay, and the overlay stayed open. The float now stays open. This applies to `Popover`, `DropdownMenu`, `Select`, `HoverCard`, and `Tooltip`. A consumer's `onEscapeKeyDown` on the overlay content still runs first and can keep the overlay open.
