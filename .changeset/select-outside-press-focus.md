---
"@ngrok/mantle": patch
---

Keep focus on the `Select.Trigger` after a press outside the open list, as in 0.94.1 and as with a native select. A press on blank space closed the list and moved focus to the body. The press cancels its `pointerdown`, so a browser that still sends a `mousedown` after that, such as some touch browsers, can still move focus.
