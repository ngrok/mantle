---
"@ngrok/mantle": patch
---

Fit the chart tooltip readout inside its plot in `BarChart`, `LineChart`, `AreaChart`, `ScatterPlot`, and `WorldMap`. A card that clips its content, such as `Panel` or `Table`, no longer cuts off the last rows of a chart with many series. The readout now lists series by value, largest first, so its order can differ from before. It shows at most `maxRows` series rows (a new `Tooltip` prop, default `8`) and only the rows that fit the plot. The rest fold into a "+N more" row. The readout is no wider than its chart, so a long label wraps. The keyboard announcement still gives every value, and so does the data table for the rows it shows. `WorldMap` keeps its drawn order. A `children` readout does not change.
