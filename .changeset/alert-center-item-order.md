---
"@ngrok/mantle": patch
---

`AlertCenter.Item` takes an optional `order`, so you can decide which of two same-intent alerts the bar shows.

The center ranks alerts by `intent`, then by `order`, then by arrival. Lower comes first. Items that share an order keep arrival order, and an item with no order follows every item that declares one, so ordering your own alerts never lets another author's items cut in. `intent` still decides the tier: a `warning` with `order={0}` never outranks a `danger`.

Set it when two same-intent alerts come from independent sources. Two queries answer in either order, so before this change the bar showed whichever alert registered first, and nothing later repaired it, because arrival order is sticky for the store's lifetime. Every current consumer keeps its current order: all items default to the same value, so the new term ties and the comparator falls through to arrival. See the [AlertCenter.Item API](https://mantle.ngrok.com/components/feedback/alert-center#alertcenteritem).
