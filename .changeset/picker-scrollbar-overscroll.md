---
"@ngrok/mantle": patch
---

`Select.Content`, `Combobox.Content`, and `MultiSelect.Content` hide their scrollbar and stop overscroll. A list still scrolls by wheel, touch, and keyboard. A scroll past either end of a list does not bounce and does not scroll the page.
