---
"@ngrok/mantle": patch
---

After an update animation ends, a chart no longer plays it again for equal data. A finished value tween could end one rounding step from its target. The next update with equal values, such as a poll that returns the same rows, then read as a change and ran a full tween that changed no pixel: 17 frames at 60 Hz. A finished tween now holds its exact target, and that update takes one frame. This applies to `AreaChart`, `BarChart`, `LineChart`, and `ScatterPlot`.
