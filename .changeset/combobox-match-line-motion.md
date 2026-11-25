---
"@ngrok/mantle": patch
---

`Combobox.ItemValue` now animates the line under the typed match. When a match appears, its line grows from the left. When the typed text stops matching, the line sinks out of view, and a Backspace during the exit brings it back from its current position. Reduced motion shows the end state at once. After the text stops matching, the last match keeps its own span with `data-autocomplete-value`, so the line can leave from the same text.
