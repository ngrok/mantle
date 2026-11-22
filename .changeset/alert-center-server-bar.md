---
"@ngrok/mantle": patch
---

`AlertCenter` shows the top alert in the server HTML, so hydration no longer shifts the page. The server renders the top `AlertCenter.Item` as a copy of the bar, and at hydration the client bar replaces it at the same height, with no enter animation.

This works only when the items exist during the server render. Prefetch the data your items read, such as your notifications query, in the root loader. Without the prefetch, the server has no items, and the bar still enters after hydration and pushes the page down. The items must also follow `AlertCenter.Bar` in the same parent; an item authored elsewhere enters after hydration, as before.
