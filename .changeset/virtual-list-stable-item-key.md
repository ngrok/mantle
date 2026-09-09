---
"@ngrok/mantle": patch
---

`List.VirtualRoot` and `SelectableList.VirtualViewport` no longer re-render every mounted row each time the visible window moves. The row key function handed to the virtualizer now keeps its identity across renders, so the virtualizer keeps its measurements and a scroll over measured rows re-renders only the rows that enter or leave the window. A row whose measured height differs from `estimateItemHeight` still re-renders the mounted rows once on the frame that measures it. Row keys still follow your `key` props across a reorder or filter.
