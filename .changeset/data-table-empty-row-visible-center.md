---
"@ngrok/mantle": patch
---

Center `DataTable.EmptyRow` content in the visible width of the table. Before, a table wider than its container, such as one on a phone, centered the empty state in the full scroll width, so it showed off screen. The content now stays in view while the table scrolls.
