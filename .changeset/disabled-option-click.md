---
"@ngrok/mantle": patch
---

Fix `Combobox.Item`, `MultiSelect.Item`, and `Select.Item` so a click on a disabled item does not run its `onClick`. Before, the handler ran, so a disabled "create" or "load more" row still did its action.
