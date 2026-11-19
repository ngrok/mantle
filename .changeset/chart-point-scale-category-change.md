---
"@ngrok/mantle": patch
---

`LineChart` and `AreaChart` with string x values no longer animate an x domain that no paint reads. When a category came or went and the tick labels stayed, the chart painted the same picture 17 to 22 more times. It now paints one frame. A dense series, which draws one column for each device pixel, keeps its glide.
