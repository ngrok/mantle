---
"@ngrok/mantle": patch
---

Fix `BarChart` rendering on stacked charts whose series are zero on most columns — the shape a "usage by
provider" or "usage by access key" chart produces. Five defects, all of which got louder as the series count
grew.

**The rounded cap went to the last-registered series, not to the segment on top.** `rounded` came from
`seriesIndex === specs.length - 1`, computed once per series outside the per-column loop. A value of exactly
`0` is not a gap — it stacks with `lower === upper` — so the last series pushed a zero-extent rect carrying the
column's only rounded corner, and the renderer dropped it for having no height. Two columns with
pixel-identical silhouettes rendered one square and one capped, decided by which alphabetically-sorted series
happened to have data. `computeStackBoundaries` now records the data end of each column's positive and
negative pile, and the cap goes to every segment reaching that end within a pixel. Pixel distance settles the
sub-pixel case too: a series contributing a fraction of a pixel paints no ink, so it can no longer take the
cap away from the segment the column actually shows.

**The 2px surface gap carved against nothing.** The old gate asked only `seriesIndex > 0`, which never asked
whether a segment painted below. With sparse data the first painted segment routinely sits at a nonzero series
index with a stacked lower boundary still at `0`, so the whole column lifted 2px off the zero baseline and
showed the grid through the seam. The gate is now the zero pixel: a column whose stack below rounds to no ink
stays welded to the axis.

**The gap also erased segments shorter than 2px.** Subtracting the full gap from a 1px segment pushed its
baseline edge past its data edge, and the renderer drew the inverted rect on the wrong side of its own
boundary — or dropped it outright when the two edges met. Sub-cent contributions against a dollar-scale axis
land in that regime constantly. The carve now takes at most half the segment, so a taller segment always
paints taller.

**Diverging stacks capped the wrong end.** `computeStackBoundaries` stores a negative segment inverted, so
reading `lower` as the baseline side put the cap, the enter reveal, and the gap on the edge facing zero. Each
segment now picks its ends by pile.

**`orientation="horizontal"` had all four defects verbatim.** Both orientations now share one pure
`stackedSegmentEdges` helper instead of mirrored copies.

Alongside those, three fixes to how a bar chart reads under the pointer:

- **The hover band no longer washes over its neighbors.** It drew at `max(step, 24)px` while the hit region is
  exactly one step, so above roughly 43 categories the highlight reached into the next bar — at 60 categories,
  a third of the way — and at the last category it spilled past the plot edge. The band now covers the same
  span the hit test inverts, and it centers itself when a dense axis drives the step below a pixel.
- **A stacked segment resolves by containment.** `onDatumActivate`'s `dataKey` came from the nearest cumulative
  boundary, which is right for a stacked line or area, where the mark *is* the boundary. For a bar the mark is
  the filled span, so the half of every segment nearer the baseline reported the series below it.
- **A tooltip no longer covers the x-axis tick labels.** The vertical clamp reached the bottom of the plot
  wrapper, which is the row the axis band reserves for its labels. The clamp now holds the readout inside the
  plot rect and falls back to the wrapper's top edge only for a readout too tall to fit.

Finally, **an all-zero bar or area chart keeps its baseline at the axis minimum.** Nicing a flat domain pads it
to `[-1, 1]`, which floated the zero line through the middle of the plot on a chart whose minimum is
documented as fixed at `0` — visible on any "no usage yet" card.

Two additions cover all four chart families:

- **The three hover layers now carry a `data-slot`.** `<family>-crosshair`, `<family>-hover-band`, and
  `<family>-markers` join the slots the Root already stamps, so a consumer restyles a layer through the slot
  instead of a structural child selector. Each family's docs page gains a data-attribute table listing the
  Root's whole slot inventory. The layers mount on every kind, and the engine writes their geometry as inline
  styles — restyle color and border, and leave the transform alone.
- **The docs no longer promise composition order.** The store keys a series' paint position and color slot to
  its `dataKey` on first registration, and never releases either. Series that mount together do register in
  composition order, but a series that mounts later paints last whatever its position in the JSX, a `dataKey`
  that returns resumes its original position, and reordering the parts of a mounted chart restacks nothing.
  Nine sentences across the four pages and their JSDoc twins said otherwise. The palette cursor also counts
  every `dataKey` a Root has ever registered rather than the mounted count, which the pages now say — key the
  Root on whatever chooses the series to start the eight slots over.

Nothing here changes a prop or an export. Grouped bars, single-series bars, and the line and scatter families
keep their geometry.
