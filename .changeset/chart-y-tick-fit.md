---
"@ngrok/mantle": patch
---

Fix chart y-axis labels that overlap at short plot heights, and fix other chart papercuts.

- **`YAxis` fits its ticks to the plot height.** A vertical value axis keeps about 28px for each tick, and it skips a label that would overlap its neighbor. A 64px chart over a `[0, 200]` domain now paints `0` and `200`, not five stacked labels.
- **`YAxis` `tickCount` is a maximum.** The axis selects a larger step when the human-friendly step gives more ticks than you asked for: `tickCount={3}` over `[0, 200]` paints `0, 100, 200`, not `0, 50, 100, 150, 200`. When you omit `tickCount`, the axis still aims for about 5 ticks.
- **`tickFormat` receives a second argument.** On `YAxis` it is `{ defaultLabel, step }`. On `XAxis` it is `{ defaultLabel }`. `defaultLabel` is the label the axis paints without a formatter, and its precision follows the step, so a formatter that adds a unit no longer has to guess the precision: ``tickFormat={(value, { defaultLabel }) => `$${defaultLabel}`}``. Formatters that take one argument keep working.
- **`Legend` no longer takes the plot's height.** The legend is at most 64px tall (`max-h-16`) and scrolls past that, so a chart with many series keeps its plot in a fixed-height `Root`. Set a `max-h-*` class in `className` to change the bound. When the legend scrolls, it is in the Tab order, so a keyboard user can scroll it.
- **A `dataKey`, `xKey`, or `zKey` typo error lists the keys of every row.** It listed only the keys of the first row, so a key that only later rows carry was missing from the list.
- **`dist/llms.txt` says that it is an index.** It points agents at the bundled `.d.ts` files for props.
- **A streaming chart paints faster.** The left-edge fade no longer copies the whole canvas each frame. It paints the grid beneath the faded marks, so the chart keeps one canvas, not two.
- **A live line or area chart scrolls at one constant speed.** When appends arrive at a steady rate, the chart measures the time between them and glides the x domain to each new target over that interval. The domain chased each target, so the chart surged right after an append and nearly stopped before the next one. In a 60-point stream with an append every 200ms, the fastest frame scrolled 11.6 times as far as the slowest, and 8.4% of frames stalled. The fastest frame now scrolls 1.05 times as far as the slowest, and no frame stalls. When an append does not move the x domain, the chart does not paint. A data swap, reduced motion, and `animate={false}` keep their behavior.
- **Charts paint and ingest with less CPU and less garbage.** Axis labels are formatted and measured once, not on every frame, and measured again when a web font loads. Bars reuse their geometry objects across frames. Same-alpha gridlines share one stroke. A continuous-x ingest uses typed arrays, not one object per row. A pointer hover no longer rewrites unchanged hover-dot styles, and it no longer re-renders the screen-reader announcer. An axis, grid, or tooltip registration no longer re-renders the legend or the data table. Measured in headless Chromium with React's production build (mean of 3 runs):

  | Scenario                                   | Metric                                | Before | After |
  | ------------------------------------------ | ------------------------------------- | -----: | ----: |
  | 800-category × 3-series bar chart, tween   | main-thread ms per frame              |   0.69 |  0.29 |
  |                                            | chart-code KB allocated per frame     |    236 |    29 |
  |                                            | `measureText` calls per frame         |     25 |     0 |
  | 20k-point area chart, window slides        | ms per data update (React + ingest)   |   5.40 |  2.65 |
  |                                            | chart-code KB allocated per frame     |    840 |   253 |
  | 4-series line chart, pointer sweep         | `setAttribute` calls per pointer move |    4.1 |  0.13 |
