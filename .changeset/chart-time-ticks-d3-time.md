---
"@ngrok/mantle": patch
---

Charts compute time-axis ticks and labels with `d3-time` and `d3-time-format` directly instead of `d3-scale`. The ticks and labels are the same as before: a test compares them with `d3-scale`'s `scaleTime` across 4,000 domains. `d3-scale` pulled in `d3-interpolate` and `d3-color`, which no chart reads, so each chart family ships about 6 KB less JavaScript (minified and gzipped).
