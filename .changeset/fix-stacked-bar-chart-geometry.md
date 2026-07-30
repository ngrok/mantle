---
"@ngrok/mantle": patch
---

Fix `BarChart` rendering on stacked charts whose series are zero on most columns — the shape a "usage by
provider" or "usage by access key" chart produces. Five defects, all of which got louder as the series count
grew.

**The rounded cap went to the last-registered series, not to the segment on top.** `rounded` was computed once
per series from `seriesIndex === specs.length - 1`, outside the per-column loop. A value of exactly `0` is not
a gap — it stacks with `lower === upper` — so the last series pushed a zero-extent rect carrying the column's
only rounded corner, and the renderer dropped it for having no height. Two columns with pixel-identical
silhouettes rendered one square and one capped, decided by which alphabetically-sorted series happened to have
data. `computeStackBoundaries` now records the data end of each column's positive and negative pile, and the
cap follows the segment that is actually outermost there.

**The 2px surface gap was carved against nothing.** The carve was gated on `seriesIndex > 0` alone, which never
asked whether a segment painted below. With sparse data the first painted segment routinely sits at a nonzero
series index with a stacked lower boundary still at `0`, so the whole column lifted 2px off the zero baseline
and showed the grid through the seam. The gate is now the boundary itself: carve only where a neighbor adjoins.

**The gap also erased segments shorter than 2px.** Subtracting the full gap from a 1px segment pushed its
baseline edge past its data edge, and the renderer drew the inverted rect on the wrong side of its own
boundary — or dropped it outright when the two edges met. Sub-cent contributions against a dollar-scale axis
land in that regime constantly. The carve is now skipped for any segment shorter than the gap.

**Diverging stacks capped the wrong end.** `computeStackBoundaries` stores a negative segment inverted, so
reading `lower` as the baseline side put the cap, the enter reveal, and the gap on the edge facing zero. The
segment's ends are now chosen by pile.

**`orientation="horizontal"` had all four defects verbatim.** Both orientations now share one pure
`stackedSegmentEdges` helper instead of mirrored copies.

Alongside those, three fixes to how a bar chart reads under the pointer:

- **The hover band no longer washes over its neighbors.** It was drawn at `max(step, 24)px` while the hit
  region is exactly one step, so above roughly 43 categories the highlight reached into the next bar — at 60
  categories, a third of the way — and at the last category it spilled past the plot edge. The band is now
  drawn from the same span the hit test inverts.
- **A stacked segment resolves by containment.** `onDatumActivate`'s `dataKey` came from the nearest
  cumulative boundary, which is right for a stacked line or area, where the mark *is* the boundary. For a bar
  the mark is the filled span, so the half of every segment nearer the baseline reported the series below it.
- **A tooltip taller than the plot no longer wastes its inset.** The vertical clamp ran against the inset plot
  rect, so an oversized readout pinned below the top padding and spilled the whole overflow past the bottom.
  It now clamps against the plot box.

Finally, **an all-zero bar chart keeps its baseline at the axis minimum.** Nicing a flat domain pads it to
`[-1, 1]`, which floated the zero line through the middle of the plot on a chart whose minimum is documented
as fixed at `0` — visible on any "no usage yet" card.

Nothing here changes an API. Grouped bars, single-series bars, and the line, area, and scatter families keep
their geometry; only the tooltip clamp is shared with them, and it is strictly more room.
