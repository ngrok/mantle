---
"@ngrok/mantle": patch
---

Fix two bugs of `Popover` with `presentation="auto"` on a phone. A `Drawer.Close` in `Popover.Content` now closes the enclosing `Drawer`, as it does when the popover floats. A press on the drawer's backdrop no longer reaches a clickable parent of the trigger, such as a table row. The same fix applies to the backdrop of a `Dialog`, `AlertDialog`, `Sheet`, and `Drawer`, so a click listener on `document` or `window` now sees a backdrop click only in the capture phase.
