---
"@ngrok/mantle": patch
---

`BarChart`, `LineChart`, and `AreaChart` no longer load the scatter plot's code: its point paint, its hit test, its 3D camera and rotation drag, and its cube frame. Only `ScatterPlot` loads that code now, so each of the other chart families ships 2.3 KB less JavaScript (minified and gzipped, 50.6 KB to 48.3 KB).
