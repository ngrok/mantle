---
"@ngrok/mantle": patch
---

`BarChart.Root`, `LineChart.Root`, `AreaChart.Root`, and `ScatterPlot.Root` now paint a `decorative` chart
recessed: a soft blur (`blur-xs`) at 70% opacity.

A decorative chart is the backdrop behind an empty-state message, and the marks must not compete with the copy.
The recession pushes them back, so the message reads as the foreground and the chart reads as atmosphere.

**Compose `Empty.Scrim` into any message you lay over the chart.** `Empty.Description` sits on `text-muted`,
which measures 4.88:1 on a bare light card — 0.38 over the 4.5:1 floor for 14px text. A mark under that text
spends the headroom, and at this recession the worst chart slot leaves the description at 2.74:1 in the light
theme. The scrim repaints the surface behind the copy and hands the message back the contrast it would have on
a bare card. `chart/recession-contrast.test.tsx` measures every slot in every theme, reading the recession's
opacity off a rendered chart and the scrim's surface off a rendered `Empty.Scrim`, so neither can drift from
the other.

The blur buys no contrast — under the middle of a mark it leaves the color where it was. It is the depth cue.

Every `decorative` chart picks the recession up with no call-site change, and both classes are defaults that
`cx` merges away. Pass your own `blur-*` or `opacity-*` in `className` to retune it, and re-measure the message
against the marks when you do. A call site that already passes its own `opacity-*` keeps the value it set.

An interactive chart is unchanged. It carries real data, so it is never a backdrop.

Docs: https://mantle.ngrok.com/components/charts/bar-chart#decorative-charts
