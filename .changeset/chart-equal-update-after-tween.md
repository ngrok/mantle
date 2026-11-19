---
"@ngrok/mantle": patch
---

A chart no longer plays its update animation again for equal data. A finished value tween could end one rounding step from its target. The next update with equal values, such as a poll that returns the same rows, then read as a change and ran a full tween that changed no pixel: 17 frames at 60 Hz. A finished tween now holds its exact target, and that update takes one frame. This applies to `AreaChart`, `BarChart`, `LineChart`, and `ScatterPlot`.
