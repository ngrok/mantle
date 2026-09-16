---
"@ngrok/mantle": patch
---

`AlertCenter.Item` no longer crashes on a page a browser translation engine has translated. The item portals its `children` into a per-id host element, and a portal owns no node of its own, so React removed each of those children from the host one at a time. When a child was a bare string, Google Translate had already reparented that text node into a `<font>` wrapper, and the `removeChild` raised `NotFoundError`. React re-threw the raw `DOMException`, which tore down the React root and blanked the page. Dismissing the alert and navigating away from the route both took that path, and both are the documented way to remove an item.

`children` now render inside a `<div data-slot="alert-center-item-label">`, which is the only node the portal puts in the host. React removes that element instead of a text node, and an element removal cannot throw. A lone string child also moves onto React's `textContent` path, which wipes the translation wrapper, so a swap between text and an element inside the item is safe too.

The wrapper is `display: contents`, so it adds no box: `Alert.Icon` and `Alert.Content` stay direct flex items of the banner chrome and keep its `gap`. The bar's exit ghost now reads the wrapper's children rather than the host's, so an item whose children render nothing still captures no ghost. `alert-center-item-label` is public API, and the docs page lists it beside `alert-center-item-host`.
