---
"@ngrok/mantle": patch
---

A `yDomain` change on a chart no longer re-reads the data. Changing `yDomain` on `LineChart`, `AreaChart`, `BarChart`, or `ScatterPlot` used to re-ingest every row of every series, rebuild the stack, and drop the decimation cache, although none of those depend on the y domain. The chart now re-aims the value axis directly, so a slider or a toggle that drives `yDomain` from state stays smooth on large data. With `animate` on, the axis still glides to the new domain. With `animate` off, or under reduced motion, it snaps.
