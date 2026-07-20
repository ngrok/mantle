# Canvas chart family: BarChart, LineChart, AreaChart, ScatterPlot

**Date:** 2026-07-18 (ScatterPlot + live-motion engine: 2026-07-19)
**Status:** Accepted
**Scope:** `packages/mantle/src/components/{bar-chart,line-chart,area-chart,scatter-plot,chart}`, the `--color-chart-*` design tokens in all four theme files

## Decision

Mantle's charting components are compound components with a shadcn-style
compositional shape, rendered by a shared **Canvas 2D engine** (not SVG, not
recharts), with **granular subpath exports** (`@ngrok/mantle/bar-chart`,
`@ngrok/mantle/line-chart`, `@ngrok/mantle/area-chart`) and a shared internal
`chart/` directory that is never published (tsdown `doNotPublish`, the
`dialog/primitive` pattern one directory up).

```tsx
<BarChart.Root data={data} xKey="month" aria-label="Visitors by month">
	<BarChart.Grid />
	<BarChart.XAxis />
	<BarChart.YAxis />
	<BarChart.Bar dataKey="desktop" label="Desktop" />
	<BarChart.Bar dataKey="mobile" label="Mobile" />
	<BarChart.Tooltip />
	<BarChart.Legend />
</BarChart.Root>
```

## Why canvas, and why this engine shape

Recharts (SVG, React-reconciled marks) was rejected for performance: it
re-renders element trees per frame and degrades visibly past a few thousand
points. The engine follows the architecture uPlot proved out (the fastest
Canvas 2D charting library), with d3 supplying the math it hand-rolls:

- **On-demand rendering.** Every mutation coalesces through dirty flags into
  one rAF commit; there is no always-on loop; an idle chart costs zero CPU.
- **Min/max-per-pixel-column decimation** past 4 points per device-pixel
  column (with 3× exit hysteresis): a full-resolution path rasterizes to
  exactly the vertical sliver between each column's min and max, so emitting
  ≤4 vertices per column is visually lossless and redraw cost is O(plot
  width), not O(points). 100k-point charts redraw in the frame budget.
- **Stacking runs before decimation** (cumulative boundary series, then
  bucket the boundaries) — decimating raw series first fabricates geometry
  because per-column extrema of different series occur at different samples.
- **Hover never repaints the canvas.** The crosshair, active-point markers,
  hover band, and tooltip are DOM overlay elements moved with transforms;
  pointer events write to the engine and hit-test via binary search
  (continuous x) or band-step inversion (categorical x).
- **d3-scale/d3-array/d3-shape as math authority only** (ticks, nice domains,
  calendar-aware time ticks, curve interpolation); per-point mapping uses
  hand-derived `value * k + b` coefficients in the paint loops. d3-selection/
  d3-transition/d3-axis are deliberately absent.
- **Interruptible tweens** per channel (x domain, y domain, per-datum
  buffers); retargeting starts from current values. Per-datum tweens only run
  ≤2,500 points with an identical x vector — streaming appends animate the
  domain (a scroll), never index-misaligned values. `prefers-reduced-motion`
  and `animate={false}` collapse every tween to a snap.
- **Theme-token colors resolved at runtime** via a probe element per chart
  root (so `--color-chart-*` overrides scoped to a wrapper work), cached per
  theme signature, invalidated by a MutationObserver on the documentElement
  attributes ThemeProvider writes (the `MantleStyleSheets` channel). Canvas
  `fillStyle` parses the `oklch()`/`color-mix()` strings mantle tokens
  resolve to natively.
- **Renderer seam:** `ctx` never leaves `chart/renderer.ts`; the engine emits
  geometry. A WebGL backend could slot in behind the same seam later without
  API changes.

## API decisions (and the review findings that drove them)

An adversarial four-reviewer design pass (conventions, dataviz method,
performance, consumer ergonomics) reshaped the draft API:

1. **Interaction is Root's unconditional contract.** Keyboard stepping
   (arrows/PageUp/PageDown/Home/End/Escape, Enter/Space activation),
   aria-live announcements, the hover layer, and the sr-only data table ship
   with `Root` — no composable part can strip accessibility. The `Tooltip`
   part _customizes_ the always-on readout (formats, footer, render-prop
   children); it is not an on-switch.
2. **Sticky color slots.** The first registration of a `dataKey` claims the
   next never-used `--color-chart-N` slot for the Root's lifetime; filtering
   a series out never recolors survivors (color follows the entity, not its
   row number). Unpinned series past eight all use `--color-chart-other`
   (never a recycled hue — fold to "Other" instead).
3. **Fail fast on programmer error.** A `dataKey` matching zero rows of
   non-empty data throws a tiny-invariant listing the available keys; parts
   outside Root throw; series parts in the wrong family Root throw. Per-row
   `null`/missing values are gaps (correct data semantics, not errors).
4. **Invalid states unrepresentable.** `stacked` lives on Root (bar/area
   only) so half-stacked charts cannot be expressed; `BarChart.Root`'s
   `yDomain` is typed `[0, number | "auto"]` so a truncated-bar baseline is a
   compile error; every chart requires `aria-label` OR `aria-labelledby` via
   a union type; `xScale` exists only on line/area (bars are always band).
5. **`xKey` over `x`** (it names a key, parallels `dataKey`, and Root's own
   generic types it as `Extract<keyof TDatum, string>`). Series `dataKey`
   stays `string` — a compound part cannot soundly thread Root's generic
   through context; the ingest invariant is the runtime backstop.
6. **Legend is an explicit part** (no mantle part renders unbidden) but
   renders `null` for a single series (one color needs no legend box) and is
   present in every multi-series docs example. Swatches mirror the mark and
   its glyph: the series' shape riding a short stroke for lines, the shape
   itself for scatter points and areas (what the hover dot shows), filled
   squares for bars (which carry no glyph).
7. **Consumer needs surfaced by the ergonomics review** shipped in v1:
   `onDatumActivate` (click/Enter with `{ index, xValue, datum, dataKey }`),
   controlled `activeIndex`/`onActiveIndexChange` (linked crosshairs),
   `ReferenceLine` (SLO thresholds), `pending` (opacity-hold on refetch —
   never a skeleton flash), tooltip `footer` + snapshot `index`/`datum`,
   `connectNulls`, and a Legend render-prop.
8. **Bounded a11y twin.** The sr-only table caps at 150 rows with a
   summarizing caption; keyboard arrows stride by device-pixel column when
   decimated so dense charts stay traversable; announcements are debounced.

## The `--color-chart-*` tokens

Chart series colors are first-class design tokens defined per theme file and
registered in `@theme inline` (so `bg-chart-1` utilities exist). Slots were
derived from mantle's existing ramps by exhaustive search using the exact
CVD-simulation math (Machado 2009, severity 1.0) and validated per theme
against that theme's card surface:

| Theme                  | Result                                                                                                                                                                                                            |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| light (`#ffffff` card) | all gates pass, zero warns — worst adjacent CVD ΔE 14.0 (target ≥ 8), normal-vision floor 15.7 (≥ 15), all slots ≥ 3:1                                                                                            |
| dark (`#171717` card)  | all gates pass, zero warns (dark ramps mirror light, so slots resolve to the same colors from per-mode steps)                                                                                                     |
| light high contrast    | all gates pass — pink/teal move to their 300 steps (the only steps clearing chroma + adjacency in the compressed HC ramps)                                                                                        |
| dark high contrast     | CVD/normal/chroma/contrast pass (6.8–12.2:1, zero warns); the standard dark lightness band is unsatisfiable by construction (bimodal ramps) — deliberately brighter marks are the correct high-contrast trade-off |

Semantic ramps (sky/emerald/rose/amber/purple) are excluded from series slots
so a series never impersonates a status color; a series that _means_ good/bad
should wear status tokens explicitly. `chart/tokens.test.ts` pins the
slot→token mapping in all four theme files — editing a theme file fails the
build until the new values are re-validated.

## ScatterPlot and the live-motion engine (2026-07-19)

**ScatterPlot** joined the family with two modes on the same engine:

- **2D**: continuous x AND y; hover hits the nearest point within 24px (never
  a pinpoint target); the tooltip names only the hit point's series (pointer)
  or the row's populated series (keyboard). Rendering degrades by total point
  count: surface rings drop past 5k points, dots become fast-path rects past
  20k. Scatter is an **all-pairs** chart form, so the validated palette caps
  it at four series (the first four slots pass `--pairs all` in both modes).
- **3D**: `zKey` on Root renders a rotatable point cloud — still Canvas 2D,
  via a pure projection module (`chart/projection.ts`: yaw/pitch rotation,
  weak perspective, depth sort, clamped pitch so the cube never flips).
  Drag-to-rotate uses pointer capture; a tap still inspects/activates. Axis
  parts and reference lines are 2D-only (the cube wireframe carries
  orientation); z flows through the tooltip, aria-live announcements, and the
  sr-only table.
- **`dimensions` morph** (modeled on the ngrok blog's prompt-caching
  dimensionality explainer, `local/frontend` `dimensionality.tsx`, which
  lerps points toward per-dimension collapsed targets at 0.18/frame under
  three.js): `dimensions: 1 | 2 | 3` on the 3D Root chases per-axis collapse
  factors `[fy, fz]` that scale the normalized y/z coordinates before
  projection — the cloud glides onto the x-axis line, the xy plane, or the
  full cube, and the y/z frame edges + wireframe fade with their factors.
  Two chased scalars beat per-point target buffers: O(1) state at any point
  count, and reduced motion snaps for free. This deliberately does NOT extend 3D to the other chart
  kinds or promise a camera API — true 3D scenes remain a hypothetical
  separate component; scatter projection is pure math on the existing
  renderer seam.

**Live-motion engine** (prompted by streaming examples feeling like
ease-stop-jump "ticks" next to liveline): domain animation switched from
fixed-duration cubic tweens to **frame-rate-independent exponential chases**
(`ChaseTween`: `factor = 1 − (1−speed)^(dt/16.67)`, dt clamped, snap-epsilon
terminated so idle charts still cost zero CPU). Regular retargets — streaming
appends at any cadence — read as continuous scrolling because the glide never
completes-and-stops between updates and retargeting continues from the
current value by construction. Axis ticks and gridlines gained **per-label
alpha fade state** (liveline's pattern): desired tick sets fade in/out and
slide with the gliding domain instead of popping, with gridlines sharing the
label alphas. Per-datum morphs and enter reveals stay fixed-duration cubic;
`prefers-reduced-motion`/`animate={false}` snap everything, fades included.

**Left-edge scroll mask** (also liveline's pattern, adapted): a sliding
window hard-clips exiting marks at the plot's left edge while the chasing
domain opens a pulsing wedge there — the step-like jank live charts showed.
When an ingest carries the streaming signature (first x advanced, last x
kept up), marks paint through an offscreen layer that is erased with a
`destination-out` gradient over a 40px band at the plot's left edge, then
composited over the grid (erasing on the main canvas would punch out
gridlines — liveline gets away with that; our grid paints under the marks).
Activation is automatic (no prop), eases in/out, and retires ~1s after the
stream idles via a one-shot timer, preserving idle-at-zero-CPU. Reduced
motion snaps the strength but keeps the mask — a static gradient is not
motion. Deferred escalation if the wedge ever shows through the fade: a
paint-only "exit buffer" retaining recently dropped leading rows to fill the
wedge with real data (interacts with stacking/decimation/hit-testing/the
sr-only twin, so it stays deferred until proven necessary).

## Deferred (named, not forgotten)

Horizontal bars (`orientation` is an additive prop later), direct end-of-line
/ bar-cap value labels, a visible table-view toggle, pinned/click tooltips
via `Popover.Anchor virtualRef`, per-datum emphasis (Cell-equivalent),
brush/zoom gestures, quadtree/grid-bucketed scatter hit-testing (the linear
scan is fine to ~50k points), scatter point-size encoding (bubbles),
3D-scatter tick labels on cube edges, camera inertia, PNG-export handle,
sequential/diverging ramps, texture fills, WebGL renderer.

## Alternatives rejected

- **One `@ngrok/mantle/charts` subpath:** chart-specific parts (Bar/Line/
  Area, per-chart Root constraints) make per-chart subpaths the honest
  granularity; docs slugs match subpaths so the manifest needs no overrides.
- **shadcn's config-object + re-exported recharts primitives:** the config
  registry's virtues (metadata in one place, scoped CSS variables) survive as
  per-part props + `var(--color-chart-N)`; the vices (axis boilerplate,
  `stackId` string pairing, `layout="vertical"`, fragile CSS re-skinning of
  recharts internals) do not.
- **SVG rendering:** cannot hit the 10k–100k+ point target with animation.
- **An always-on rAF loop (liveline):** correct for a live-scrolling chart
  whose x domain moves every frame; wrong for dashboards that are mostly
  static — mantle charts idle at zero CPU.
