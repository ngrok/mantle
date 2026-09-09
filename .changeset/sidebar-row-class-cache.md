---
"@ngrok/mantle": patch
---

`Sidebar.ItemButton` and `Sidebar.SearchTrigger` now merge their shared row classes through the `cx` argument cache. Before this change, each row render rebuilt and re-hashed a long class string. A navigation that re-renders every row of a large sidebar paid that cost once per row. The rendered `className` is unchanged.
