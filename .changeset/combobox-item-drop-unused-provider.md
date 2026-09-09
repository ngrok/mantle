---
"@ngrok/mantle": patch
---

`Combobox.Item` no longer wraps each item in a context provider that nothing read. `Combobox.ItemValue` takes the item value from ariakit's own item context, as before, so the rendered DOM, the data attributes, and the match highlighting are unchanged. A long list mounts one React node less per item.
