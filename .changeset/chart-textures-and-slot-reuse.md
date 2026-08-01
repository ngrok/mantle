---
"@ngrok/mantle": patch
---

**Bar Chart: two new fill textures, one per color slot.** `BarChart.Bar`'s `texture` prop takes eight values now —
`"solid"`, `"hatch"`, `"hatch-reverse"`, `"crosshatch"`, `"perpendicular"`, `"parallel"`, `"grid"`, `"dots"` — one for
each of the palette's eight validated color slots. Both additions paint on the bars and on the series' legend key. The
key's `data-texture` attribute carries the new values for consumer CSS.

**`"parallel"`** inks one rung per tile along the bar's length: vertical lines on vertical bars, horizontal lines on
horizontal bars. It is the exact complement of `"perpendicular"`, whose rung runs across the bar's length instead. Both
rung textures flip with the Root's `orientation`, in opposite senses, so a horizontal chart keeps the two apart.

**`"grid"`** inks both rung directions at once — the orthogonal lattice against `"crosshatch"`'s diagonal one. It is
direction-free: an `orientation` change leaves the lattice identical. Two rung directions ink twice over, so its rungs
are thinner than `"perpendicular"`'s lone rung; at the rung width a grid tile would read as a darker solid. Both new
tiles measure inside the ink-coverage band the five non-solid values before them set, so a textured series never shouts
over a solid one.

Texture stays a redundant identity encoding alongside color, never decoration. The ink is tone-on-tone — a darker step
of the series' own fill — so a chart keeps its series apart without color vision, in grayscale print, and under forced
colors. Keep it opt-in: leave the first series solid and texture the rest, or texture only the pair that color alone
cannot separate.

**Several series may share one series slot on purpose.** Set the same `seriesSlot` on every member, then give each
member its own `texture`. The chart reserves that slot once. Three series with `seriesSlot={1}` and three textures
leave seven slots for their automatic siblings, so ten series paint in categorical colors and none falls to
`--color-chart-other`.

Four things to know before you reach for it:

- **Every member sets the same `seriesSlot`.** Mantle reserves fixed slots before automatic series take the remaining
  slots.
- **Give every member a distinct `texture`.** Nothing checks it. Two series may share one slot with the same texture,
  paint pixel-identically, and draw no warning.
- **A member that drops `seriesSlot` needs a slot of its own.** It takes the next unreserved slot in composition order.
- **One hue across several series reads as one group.** Reach for the technique when those series really do belong
  together, keep the legend on screen, and check the shared token against its neighbors first. Texture is a second
  encoding on top of a legal color, and it never makes an illegal color legal: a pair under the colorblind-safe floor
  stays illegible whatever the fill.

Eight series or fewer is still the default advice — rank by the window's total, keep the top seven, and sum the rest
into one `"Other"` series. A shared slot is the narrow exception, for series that really do belong together.

Docs: [Textures](https://mantle.ngrok.com/components/charts/bar-chart#textures) and
[Chart color tokens](https://mantle.ngrok.com/components/charts/bar-chart#chart-color-tokens).
