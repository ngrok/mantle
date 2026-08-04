---
"@ngrok/mantle": patch
---

`BarChart.Root`, `LineChart.Root`, `AreaChart.Root`, and `ScatterPlot.Root` now paint a `decorative` chart
neutral: every series wears the new `--color-chart-decorative` fill instead of its categorical slot.

A decorative chart is the backdrop behind an empty-state message. Its values are not information, so nothing
about a mark may read as a series — the fill outranks both `seriesSlot` and a series' own `color`, and it
reaches the canvas, the legend swatches, and the tooltip strokes from one place. Slots keep resolving
underneath it, so a chart that leaves `decorative` gets its palette back unshuffled.

**The fill is also what keeps an overlaid message readable, with no help from the call site.**
`Empty.Description` sits on `text-muted`, which measures 4.88:1 on a bare light card — 0.38 over the 4.5:1
floor for 14px text, so any tint under that copy spends the headroom. `--color-chart-decorative` is the
darkest neutral step that still clears the floor in all four themes: 4.56:1 in light, 4.93:1 in dark, 9.08:1
in light-high-contrast, and 8.14:1 in dark-high-contrast. `chart/decorative-contrast.test.tsx` measures every
theme, and `chart/decorative-paint.browser.test.tsx` samples the painted canvas.

- **`--color-chart-decorative` is a new token, one per theme, aliased to that theme's `neutral-200`.**
  Redeclare it on a Root to retune one chart —
  `className="[--color-chart-decorative:var(--color-neutral-100)]"` — and re-measure the copy against the
  value you pick.
- **No scrim, no dimming, and no blur.** A blur leaves the color under the middle of a mark where it was, and
  dimming a categorical slot far enough to rescue `text-muted` erases the chart.

Every `decorative` chart picks the fill up with no call-site change. Drop an `opacity-*` you added to a
decorative chart to tame its colors — the fill replaces it, and dimming on top only washes the marks out.

An interactive chart is unchanged. It carries real data, so it is never a backdrop.

Docs: https://mantle.ngrok.com/components/charts/bar-chart#decorative-charts
