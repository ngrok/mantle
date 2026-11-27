---
"@ngrok/mantle": patch
---

Fix `HoverCard` opening on a tap. A tap focuses the link, and that focus opened the card on a touch screen. `HoverCard.Trigger` called `preventDefault()` on `touchstart` to stop it, but React adds that listener as passive, so the call did nothing. Now the focus that a touch press causes opens nothing, as in `Tooltip`. A keyboard focus still opens the card.
