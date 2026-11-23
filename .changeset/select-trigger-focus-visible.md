---
"@ngrok/mantle": patch
---

`Select.Trigger` shows the focus ring for keyboard use only, as `Button` does. A click that opens the list no longer shows the ring or the accent border. A Tab to the trigger, or an arrow key in the open list, still shows them. The open list keeps the accent border on the trigger. `Combobox` and `MultiSelect` still show the ring on each focus, because the user types into them.
