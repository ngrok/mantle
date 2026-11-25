---
"@ngrok/mantle": patch
---

`Combobox.ItemValue` now marks the typed match with an accent underline, not a heavier weight. Before, the heavier match was wider, so the option text moved as the user typed, and the match was hard to see. The underline has at least 3:1 contrast on each row background in light and dark themes, and it stays in forced-colors mode.
