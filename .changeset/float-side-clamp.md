---
"@ngrok/mantle": patch
---

Keep a `DropdownMenu` submenu on screen when neither side of its menu has room.

On a narrow screen, a `DropdownMenu.SubContent` can have no room to the right or the left of its menu. It went off the screen before. Now it covers part of its menu and stays 8px inside the viewport, as a native menu does. A submenu whose trigger scrolls off the screen still follows it. `Tooltip`, `Popover`, and `HoverCard` do not change.

Docs: https://mantle.ngrok.com/components/overlays/dropdown-menu
