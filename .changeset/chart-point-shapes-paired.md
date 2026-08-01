---
"@ngrok/mantle": patch
---

**A series that sets no `shape` now wears the glyph paired to its series slot.** Unless a consumer picked a glyph
by hand, every line, area, and scatter series used to draw a circle. Shape carried no identity of its own. Slot 1
now takes the circle, slot 2 the square, slot 3 the triangle, slot 4 the diamond, and four new glyphs carry slots
5 through 8. Every line, area, and scatter chart gains a second identity channel with no code change — a distinct
color and a distinct glyph, on the canvas marks, the hover dots, and the legend keys.

**`PointShape` grows from four values to eight**, one per series slot: `"circle"`, `"square"`, `"triangle"`,
`"diamond"`, `"triangle-down"`, `"plus"`, `"cross"`, `"star"`. The four additions:

- **`"triangle-down"`** — the triangle mirrored, apex down.
- **`"plus"`** — a filled Greek cross whose arms are a third of its span, not a stroked line pair.
- **`"cross"`** — that plus turned 45°, so a solid X.
- **`"star"`** — a filled five-pointed star at the classic pentagram notch.

All four paint on the canvas marks, on the DOM hover dot, and on the legend key. The key's `data-shape` attribute
carries the new values for consumer CSS.

**Every glyph carries the circle's fill area**, so no series reads heavier than its neighbors. Each new size
solves area = πr² the way the shipped three do: the mirrored triangle keeps the triangle's 1.55r circumradius, the
plus reaches 1.189r, the cross reaches the same 1.189r because a rotation keeps the area, and the star's outer
radius is 1.673r against an inner 0.639r. On a real canvas the four measure between 0.994 and 1.000 of the
circle's ink, inside the band the shipped four already span.

Two surfaces cannot hold that contract exactly, and both predate this change. The hover dot and the legend key
clip a box rather than trace a path, so a polygon there paints its own share of the box — the shipped triangle
already paints 64% of the circle's ink, and the star paints 39%. Line and scatter markers stroke a 2px surface
ring on the glyph's own outline, and that ring eats inward along the whole perimeter, so a spiky glyph keeps less
of its fill: at the default marker radius the plus and the cross keep about half the circle's colored ink, and the
star about 44%.

**The pairing reads the series slot.** Automatic series take unreserved slots in composition order. A series with
`seriesSlot={3}` wears the triangle from whatever position it registers in. A series with `seriesSlot="other"`
wears the circle. Several series may share one slot. If another channel must tell them apart, give each member its
own `shape` or `texture`.

**Automatic glyphs follow the current composition.** Removing an automatic series closes the gap. When a series
must keep one color-and-shape identity as siblings appear or disappear, set `seriesSlot`.

**An explicit `shape` still wins.** The paired glyph is a default, not a policy. A chart that already sets `shape`
on every series paints exactly as it did before.

**Bar series are unchanged.** A bar encodes identity by `texture` rather than by glyph, and texture stays opt-in —
nothing assigns one for you. `shape` serves the line, area, and scatter marks.
