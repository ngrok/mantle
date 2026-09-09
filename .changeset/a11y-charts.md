---
"@ngrok/mantle": patch
---

Close accessibility and documentation gaps shared by `BarChart`, `LineChart`, `AreaChart`, and `ScatterPlot`.

- The sr-only keyboard instructions now name every key the chart handles: Left and Right, Page Up and Page Down, Home and End, Enter or Space, and Escape. They named only Left, Right, Home, End, and Enter before.
- A `decorative` chart is now `inert`, so a composed `CopyButton` inside the hidden backdrop is no longer a tab stop.
- `CopyButton` announces "Copied" through an always-mounted `role="status"` element after a copy. The icon swap was the only feedback before. A second copy inside the two-second reset window is announced again.
- The sr-only data table caption now reads the text of the `aria-labelledby` element, so a chart named by a heading gets a distinct caption instead of "Chart data".
- `BarChart.Grid`, `BarChart.XAxis`, `BarChart.YAxis`, and `BarChart.ReferenceLine` JSDoc now state the horizontal-orientation behavior, and the `Grid` default reads "perpendicular to the bars".
