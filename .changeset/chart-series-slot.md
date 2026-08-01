---
"@ngrok/mantle": minor
---

Add `seriesSlot` to `BarChart.Bar`, `LineChart.Line`, `AreaChart.Area`, and `ScatterPlot.Point` for charts that need a fixed visual identity.

Series receive unreserved slots in composition order. Set `seriesSlot` to give a series a fixed visual identity. Slots `1` through `8` select the built-in color-and-shape pair. `"other"` selects the neutral tail treatment. Several related series may share one slot.

Automatic assignments now derive from the currently composed series. Removing an automatic series closes the gap. Mantle reserves fixed slots before automatic series take the remaining slots.

The `color` and `shape` props now override only their own channels. They do not change slot assignment. When the intent is to select the fourth built-in identity rather than to override only the paint, replace `color="chart-4"` with `seriesSlot={4}`.
