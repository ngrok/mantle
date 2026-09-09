---
"@ngrok/mantle": patch
---

`List.VirtualRoot` and `SelectableList.VirtualViewport` now render the first slice of rows in the server HTML. Before this change, the server emitted the collection chrome with its full height and `aria-rowcount` but zero rows, so a server-rendered long list showed a tall empty box until hydration and no rows at all without JavaScript. `estimateItemHeight` and `overscan` size the slice; the rest of the rows mount after hydration measures the real viewport. The first client render matches the server, so this adds no hydration mismatch.
