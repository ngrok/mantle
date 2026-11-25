---
"@ngrok/mantle": patch
---

Keep a float beside its anchor inside the viewport when neither side has room.

On a narrow screen, a `DropdownMenu.SubContent` can have no room to the right or the left of its menu. It went off the screen before. Now it moves over the menu and stays 8px inside the viewport. A `Popover`, `Tooltip`, or `HoverCard` with `side="left"` or `side="right"` gets the same fix.

Docs: https://mantle.ngrok.com/components/overlays/dropdown-menu
