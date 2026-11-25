---
"@ngrok/mantle": patch
---

Open `DropdownMenu` from a click with no press, as a screen reader or `element.click()` sends.

`DropdownMenu.Trigger` opened only on a pointer press or a key. A screen reader that activates the button with a click got no menu. Now that click toggles the menu and moves focus to its first item. A pointer click and Enter or Space work as before.

Docs: https://mantle.ngrok.com/components/overlays/dropdown-menu
