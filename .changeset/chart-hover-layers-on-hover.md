---
"@ngrok/mantle": patch
---

An interactive chart makes its three hover layers (`bar-chart-crosshair`, `bar-chart-hover-band`, and `bar-chart-markers`, and the same slots in the other chart families) the first time it shows an active datum: on the first hover, the first keyboard step, or a controlled `activeIndex`. Before, each chart made them when it activated, so a page of cards held three layers for each chart that nobody pointed at. A selector or a test that reads a layer before any hover now finds nothing.
