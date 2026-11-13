---
"@ngrok/mantle": patch
---

`ScatterPlot`:

- The arrow keys step one point at a time at any density. Before, a plot with four or more rows for each device pixel of width stepped several rows at a time, as a decimated line chart does, and most points had no keyboard path.
- The loader reports a failed load of the 3D code once for each attempt, where before each 3D chart on the page reported it. The chart tries again after 1 s, 4 s, and 16 s, and on the next press or data update, so a chart that is idle recovers from a failed request.
- A series that is not revealed yet makes no draw call. A plot of 10,000 points one viewport below the fold made about 840,000 canvas calls that drew nothing.
- The 2D hit test reads only the rows within the hit radius of the pointer, found with a binary search over the sorted x values.
