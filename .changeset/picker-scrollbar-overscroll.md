---
"@ngrok/mantle": patch
---

`Select.Content`, `Combobox.Content`, and `MultiSelect.Content` hide their scrollbar and stop overscroll. A list still scrolls by wheel, touch, and keyboard. In a list that scrolls, a scroll past either end does not bounce and does not scroll the page.
