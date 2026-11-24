---
"@ngrok/mantle": patch
---

`MultiSelect` now clears its filter text when the list closes, by Escape, a press outside, or focus that leaves. The text only filters the open list and is not a value, so a closed field no longer shows stale text over the full list. `onInputValueChange` gets `""`, so a filter that reads it resets too. A pick still clears the text and keeps the list open.
