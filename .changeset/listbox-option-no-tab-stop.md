---
"@ngrok/mantle": patch
---

Keep `Select`, `Combobox`, and `MultiSelect` options out of the Tab order. An option rendered as a link or a button with `asChild` took a Tab when the field was the last control on the page, and the list stayed open. Now Tab leaves the field and closes the list, as it did in 0.95.0.
