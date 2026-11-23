---
"@ngrok/mantle": patch
---

`Dialog.Body` and `Sheet.Body` take a Tab while they scroll and hold no tab stop of their own, so a keyboard user can scroll them with the arrow keys in each browser. Chromium does this for each scroll container, and Safari does not. A body that does not scroll, or that holds a link, button, or field, gets no extra tab stop. Pass `tabIndex` to turn the automatic tab stop off.
