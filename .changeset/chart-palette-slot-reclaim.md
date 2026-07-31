---
"@ngrok/mantle": patch
---

Fix chart series painting the neutral overflow gray on a chart that shows only two or three series. A
`BarChart`, `LineChart`, `AreaChart`, or `ScatterPlot` Root assigns each series a color slot on its first
registration and keeps it for the Root's lifetime, so filtering a series out never repaints the survivors. The
cursor behind that guarantee counted every `dataKey` the Root had ever seen, not the number on screen — so a
dashboard that swaps one series vocabulary for another exhausted the eight validated slots and handed
`--color-chart-other` to everything after. A monthly chart regrouped from "by provider" to "by access key"
reached it in one click: eight provider keys registered and left, and the four keys on screen all painted the
same gray.

Once the never-used slots run out, an incoming series now takes a slot back from a holder that is no longer
mounted, oldest registration first. A mounted series is never a candidate, so the guarantee that matters — a
filter never recolors the series still on screen — holds by construction. A chart that genuinely shows more
than eight series at once still paints the ninth and later with `--color-chart-other`; eight is the palette's
validated limit for adjacent slots, so fold the long tail into a single "Other" series instead.

The one behavior this trades away: a `dataKey` whose slot was reclaimed while it was off screen does not come
back to its original color. Stickiness now holds for as long as the palette has room, which is the whole
eight-slot budget rather than forever.
