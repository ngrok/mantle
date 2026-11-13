---
"@ngrok/mantle": patch
---

Charts skip work that changes no pixel:

- A web font that loads repaints only a chart that draws text. A chart with no axis, no grid, and no labeled reference line stays as it is.
- A chart above 2,500 rows keeps no per-datum tween buffers: 24 bytes less per row for each series, 4.8 MB for 100,000 rows of two series.
- `BarChart`, `LineChart`, and `AreaChart` stay off the far visibility band, which only frees a canvas bitmap. A page of 300 charts holds 600 observer entries in place of 900.
- One intersection delivery starts one 4 ms activation slice. Before, it started up to three in one task.
- A chart that throws while it activates no longer leaves the charts queued behind it blank.
- In a browser without `scrollMargin` on `IntersectionObserver` (Safari before 26, Firefox before 141), a sparkline in a `Table` activates when it nears the viewport. Before, every sparkline in the table activated at mount.
- An SVG chart at rest holds no copy of its path strings.
