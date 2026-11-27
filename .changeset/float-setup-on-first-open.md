---
"@ngrok/mantle": patch
---

Make a closed `Tooltip.Content`, `HoverCard.Content`, or `Popover.Content` skip its float setup until it opens the first time. A page that mounts many closed floats, such as one tooltip for each table row, mounts about 20% faster. Server output, the open and close behavior, and the exit transition do not change.
