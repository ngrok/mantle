---
"@ngrok/mantle": patch
---

Make the chart enter animation easier to follow. When a `BarChart` first comes into view, its bars grow from the baseline one after another, in category order, instead of all at once. Each bar grows for 300ms, and the last bar starts at 300ms for any bar count, so the whole enter takes 600ms. A stacked column grows as one bar. A `LineChart` or an `AreaChart` series now sweeps in from the left over 600ms instead of 280ms, and a `ScatterPlot` series fades in over the same time. The enter uses the `ease-out-strong` curve. `prefers-reduced-motion` and `animate={false}` still show the chart at once.
