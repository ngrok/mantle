---
"@ngrok/mantle": patch
---

Fix three color-slot accounting bugs on a chart that mixes brand colors with the validated palette. All three show
up on one shape — a usage dashboard. It paints each known model provider in that provider's own brand color. Every
bring-your-own provider takes a `--color-chart-*` slot.

**A custom `color` now spends a slot.** Only a chart token used to reserve one, so a `BarChart`, `LineChart`,
`AreaChart`, or `ScatterPlot` series pinning a hex or a `var()` reserved nothing. The palette then handed out all
eight slots while three series already wore colors the consumer chose, and an unpinned sibling could be given a
color already on screen. OpenAI green `#10a37f` sits 7.53 ΔE from `--color-chart-5` in the light theme, and
Gemini blue `#3186ff` sits 1.34 from `--color-chart-1`, against a floor of 15. Every color but
`--color-chart-other` now spends one of the eight, so the budget counts the series a reader sees.

The slot a custom color spends is its position in registration order, never the slot the color resembles. Mantle
measures no color you pass: the nearest slot differs per theme, so measuring it would reassign a neighbor's color
on a theme switch. Check your own palette against the eight slots, and change the color or add a `texture` when a
pair reads as one series.

**A pinned token is reclaimed rather than retired.** A slot a series pinned had no release path, so it stayed
spent for the Root's lifetime even after the series unmounted — the exhaustion bug the slot reclaim exists to
prevent, still live on the pinned path. A dashboard that pinned eight providers and regrouped by access key
painted every series the overflow gray, and the ceiling was permanent: three pinned providers left five auto slots
forever. An unmounted holder's slot is now reclaimable whether it was pinned or auto-assigned. A slot a mounted
series holds is still never a candidate, and a pinned series that remounts takes its token back from whichever
series reclaimed it.

**A slot is spent only while a series holds it.** The eight-slot budget is now one ledger rather than a claimed-set
and a forward-only cursor that could disagree with it. Four shapes stop losing colors as a result:

- A `color` prop that changes — from nothing to a token, or from one token to another — releases the slot the
  series held before. It used to strand that slot: nothing painted it and nothing could reclaim it, so a chart of
  eight series shared seven colors.
- Switching a series to `chart-other` gives its slot back, which is what "pinning `chart-other` spends nothing"
  always claimed. That held on a first registration only.
- A series that overflowed a full palette takes a real slot once one comes free, instead of wearing the gray for
  the Root's lifetime.
- A series that never asked for a color can no longer be handed one another series is painting. Two `dataKey`s can
  hold one slot — a renamed key pinning the same brand token holds it alongside the record the departed key left
  behind — so the reclaim and the auto-assignment both ask who holds the slot now, not who pins it. Two series
  that both pin one token still both paint it: that collision is the consumer's explicit choice.

The `color` prop's documented contract changes with it: all four chart pages said an explicit `color` reserves its
token, which was true only for `--color-chart-1` through `--color-chart-8`. The pages now name the `chart-other`
exemption as the token, because `var(--color-chart-other)` is a CSS color like any other and does spend a slot.
The Bar Chart page gains a **Fixed colors for known entities** section covering the per-theme `var()` recipe, the
slots a custom color spends, and the collisions to check for. The Scatter Plot page names the consequence for its
all-pairs-validated slot prefix: an explicitly colored series registered first pushes its siblings onto slots 2
through 4, and `light-high-contrast` puts slots 2 and 4 under the colorblind-safe floor.
