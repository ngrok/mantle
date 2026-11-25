---
"@ngrok/mantle": patch
---

Keep `Select`, `Combobox`, and `MultiSelect` options out of the Tab order, and close an open `Combobox` or `MultiSelect` list when focus leaves the input for anything but a footer control. Since `Combobox.ContentFooter` (#1893), a `Combobox` that was the last control on the page sent Tab to an `asChild` link option and kept the list open. Now Tab leaves the field and the list closes, as in 0.95.0.
