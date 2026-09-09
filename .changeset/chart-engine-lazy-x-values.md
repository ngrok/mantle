---
"@ngrok/mantle": patch
---

`LineChart`, `AreaChart`, and `ScatterPlot` read data faster on continuous x scales. On a `"time"` scale the chart used to keep one `Date` object per row for the life of the data, so a streaming chart with 100,000 rows carried 100,000 `Date` objects across every append. The chart now builds the `Date` (or the number on a `"linear"` scale) when it publishes a hover snapshot or an `onDatumActivate` event, so each data update is faster and no per-row `Date` stays resident. The `xValue` you receive is unchanged in type and value; it is now a fresh `Date` per snapshot, so a `Date` you mutate in a handler never changes what the tooltip shows next. Band and point scales keep the raw category values as before.
