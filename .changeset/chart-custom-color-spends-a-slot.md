---
"@ngrok/mantle": patch
---

Fix two color-slot accounting bugs that surface on a chart mixing brand colors with the validated palette — a
usage dashboard that paints known AI model providers their own color and lets bring-your-own providers take a
`--color-chart-*` slot.

**A custom `color` now spends a slot.** Only a chart token used to reserve one, so a `BarChart`, `LineChart`,
`AreaChart`, or `ScatterPlot` series pinning a hex or a `var()` reserved nothing. The palette then handed out all
eight slots while three series already wore colors the consumer chose, and an unpinned sibling could be given a
color already on screen — ChatGPT green `#10a37f` sits 4.71 ΔE from `--color-chart-5`, and Gemini blue `#3186ff`
sits 5.65 from `--color-chart-1`, against a floor of 15. Every color but `--color-chart-other` now spends one of
the eight, so the budget counts the series a reader sees.

The slot a custom color spends is its position in registration order, never the slot the color resembles. Mantle
measures no color you pass: the nearest slot differs per theme, so measuring it would reassign a neighbor's color
on a theme switch. Check your own palette against the eight slots, and change the color or add a `texture` when a
pair reads as one series.

**A pinned token is reclaimed rather than retired.** `#claimedSlots` had no release path, so a pinned slot stayed
reserved for the Root's lifetime even after the series unmounted — the exhaustion bug the slot reclaim exists to
prevent, still live on the pinned path. A dashboard that pinned eight providers and regrouped by access key
painted every series the overflow gray, and the ceiling was permanent: three pinned providers left five auto slots
forever. An unmounted holder's slot is now reclaimable whether it was pinned or auto-assigned. A mounted series is
still never a candidate, and a pinned series that remounts takes its token back from whichever series reclaimed
it.

The `color` prop's documented contract changes with it: all four chart pages said an explicit `color` reserves its
token, which was true only for `--color-chart-1` through `--color-chart-8`. The Bar Chart page gains a **Fixed
colors for known entities** section covering the per-theme `var()` recipe, the slots a custom color spends, and
the collisions to check for.
