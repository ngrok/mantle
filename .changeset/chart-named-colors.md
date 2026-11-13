---
"@ngrok/mantle": minor
---

**Breaking: every chart series names its color.** `BarChart.Bar`, `LineChart.Line`, `AreaChart.Area`, and `ScatterPlot.Point` take a required `color`: a mantle color name, the same `Color` that `Badge` takes (`"blue"`, `"emerald"`, `"danger"`, `"neutral"`, …), or any CSS color. The chart no longer picks a color for a series.

- Gone: the `"chart-1"` to `"chart-8"` and `"chart-other"` token names, the `--color-chart-1` to `--color-chart-8` and `--color-chart-other` custom properties, the `seriesSlot` prop, and the point shape paired to a slot.
- New: one `--color-chart-<name>` token per color name. It paints that color's 500 step in dark mode and its 600 step in light mode. Functional names alias the hue their status color uses, and `neutral` is the color for an "Other" series.
- A series that sets no `shape` wears the circle.
- A textured bar paints a light tint of its color, with the marks in the full color, so two series of one color stay apart by texture.

Keep a chart to 8 series: the top 7, plus one "Other" series in `neutral`. The chart docs gain a "Color and accessibility" section with the WCAG 2.2 SC 1.4.11 guidance and its exemptions.

Migration guide: https://mantle.ngrok.com/migrations/0014-chart-named-colors-migration. The codemod `0014` renames the tokens and replaces `seriesSlot`; the type checker names each series that still needs a `color`.
