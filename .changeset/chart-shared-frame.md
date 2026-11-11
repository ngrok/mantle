---
"@ngrok/mantle": patch
---

Charts on one page share one animation frame: a theme switch, a resize, or a data push across 100 charts asks for one frame instead of 100, and every chart commits inside it. A chart's tooltip also measures its size through the one `ResizeObserver` the page's charts share, instead of one observer per chart that stayed connected for the chart's lifetime.
