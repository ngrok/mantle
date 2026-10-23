---
"@ngrok/mantle": patch
---

Fix chart y-axis labels that overlap at short plot heights, and fix three chart papercuts.

- **`YAxis` fits its ticks to the plot height.** A vertical value axis keeps about 28px for each tick, and it skips a label that would overlap its neighbor. A 64px chart over a `[0, 200]` domain now paints `0` and `200`, not five stacked labels.
- **`YAxis` `tickCount` is a maximum.** The axis selects a larger step when the human-friendly step gives more ticks than you asked for: `tickCount={3}` over `[0, 200]` paints `0, 100, 200`, not `0, 50, 100, 150, 200`. When you omit `tickCount`, the axis still aims for about 5 ticks.
- **`tickFormat` receives a second argument.** On `YAxis` it is `{ defaultLabel, step }`. On `XAxis` it is `{ defaultLabel }`. `defaultLabel` is the label the axis paints without a formatter, and its precision follows the step, so a formatter that adds a unit no longer has to guess the precision: ``tickFormat={(value, { defaultLabel }) => `$${defaultLabel}`}``. Formatters that take one argument keep working.
- **`Legend` no longer takes the plot's height.** The legend is at most 64px tall (`max-h-16`) and scrolls past that, so a chart with many series keeps its plot in a fixed-height `Root`. Set a `max-h-*` class in `className` to change the bound.
- **A `dataKey`, `xKey`, or `zKey` typo error lists the keys of every row.** It listed only the keys of the first row, so a key that only later rows carry was missing from the list.
- **`dist/llms.txt` says that it is an index.** It points agents at the bundled `.d.ts` files for props.
