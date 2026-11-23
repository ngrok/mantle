---
"@ngrok/mantle": patch
---

`Select.Trigger` shows the focus ring for keyboard use only, as `Button` does. A click that opens the list no longer shows the ring or the accent border. A Tab to the trigger and a failed `required` check still show them. In Chromium, an arrow key in the open list also shows them; Firefox does not re-check `:focus-visible` on a key press after a click. The open list keeps the accent border on the trigger. `Combobox` and `MultiSelect` still show the ring on each focus, because the user types into them.
