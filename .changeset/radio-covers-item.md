---
"@ngrok/mantle": patch
---

A screen reader outlines the whole `RadioGroup` or `SegmentedControl` item again, as in 0.94.1, and stops once on each item. The native radio covers its item, over the item's content. The content's text is hidden from assistive technology, because it already names the radio; an item whose content holds a link, button, label, or form control keeps it visible. Those controls sit over the radio. A Playwright or Cypress click by the item's text now lands on the radio; click it by its role or label.
