---
"@ngrok/mantle": patch
---

`BarChart` draws its bars in one new look:

- Bars fill their category step except for a 2px gap (1px, then none, as the step narrows). A sparse chart keeps its bars at the same width as before, because the thickness cap still holds them at 60% of a wide step.
- A bar, or a whole stack, rounds both ends at 2px. Before, only the data end rounded, at 4px.
- Stacked segments are 1px apart. Before, they were 2px apart.
- A chart with no axis and no grid runs its bars to the edges of its box, keeps 12% headroom over the tallest bar instead of a rounded-up maximum, and draws no zero rule.
- A stacked chart grows each column as one bar when it enters: every series rises together, and each seam stays inside the bar. A series that enters later still grows on top of the settled stack.
- On a stacked chart with two or more series, the tooltip leads with a Total row, and the hover snapshot carries `total`. A `valueFormat` receives `"total"` as the `dataKey` for that row.

The API does not change.
