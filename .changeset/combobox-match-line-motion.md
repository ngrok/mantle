---
"@ngrok/mantle": patch
---

`Combobox.ItemValue` now animates the line under the typed match. The line grows from the left as each typed character extends the match, sinks when the typed text stops matching, and rises again on Backspace. A keystroke during a transition retargets it from its current position. Reduced motion shows the end state at once. `ItemValue` now puts each character in its own span, which keeps its `data-user-value` or `data-autocomplete-value` attribute. Read the text of all spans with an attribute to get the match.
