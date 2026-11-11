# Bar, Line, and Area charts paint SVG, behind one paint seam

**Date:** 2026-11-11
**Status:** Accepted
**Amends:** the renderer item of [2026-07-18-canvas-chart-family.md](./2026-07-18-canvas-chart-family.md) ("canvas, with a renderer seam a WebGL backend could use") and the release band of [2026-10-08-chart-list-mount-cost.md](./2026-10-08-chart-list-mount-cost.md).

## Context

Agent v4 list cards (DES-186) put one small interactive chart on every card: 20 to 300 charts on a page. A study (the "Canvas or SVG for list cards?" write-up, 2026-11-04) measured 1,000+ page loads of mantle's charts against two prototypes on one shared core: SVG with one path per series, and canvas, each behind one list-level controller. It found:

- The per-chart engine is most of the cost, and the surface is the smaller part. Moving the same design from canvas to SVG still cut main-thread time on mount, hover, resize, and theme switch, and it removed every canvas bitmap.
- On a real GPU (M3 Max), bars and lines tie on frame time between the two surfaces. Canvas wins for scatter plots past about 10k points.
- The visibility observers set `rootMargin` and `scrollMargin` together, and the browsers stack the two, so 96 of 100 charts painted at mount and no canvas was freed.

## Decision

1. **Fix the bands first.** The observers set `scrollMargin` alone where the browser supports it.
2. **One paint seam, two backends.** The engine computes every mark's geometry once and draws it through `PaintContext`, a structural subset of the 2D context. The canvas backend passes a real context. The SVG backend passes a recorder that writes one `<path>` per run of draw calls with equal style, and reuses the last frame's elements. Both backends draw the same calls, so they cannot drift apart. `renderer-parity.browser.test.tsx` screenshots each scene through both and compares the pixels. Bar, Line, and Area ship SVG only, so the test paints the canvas side through test-only Roots (`test-utils/canvas-chart-roots.tsx`).
3. **Each family has one surface: SVG for Bar, Line, and Area, and canvas for ScatterPlot.** A point cloud draws one fill and one ring per point, and points overlap, so one path per style would change the paint order. A scatter plot past a few thousand points also redraws faster on canvas. Bar, Line, and Area take no `renderer` prop. No caller needed their canvas, and a prop costs a patch to add later but a minor to remove.
4. **Canvas-only code ships only with ScatterPlot.** The color probe, the theme observer, the device-pixel-ratio watcher, and bitmap release live in `canvas-backend.ts` and `canvas-colors.ts`, and only ScatterPlot imports them. ScatterPlot draws no bars, so the canvas backend has no bar textures. The SVG backend paints `var(--color-chart-N)` as CSS, so it reads no computed style to paint and a theme switch repaints nothing.
5. **Shared per-page services, not one controller object.** The page already shared one `ResizeObserver`, one trio of `IntersectionObserver`s, one print listener, one font listener, and one reduced-motion query. This change adds one animation frame per window for every engine, moves the tooltip size read onto the shared `ResizeObserver`, and adds a `List` part that gives its charts one tooltip surface and one live region. React already delegates pointer events at its root, so per-chart handlers add no listeners.
6. **Ingest is a pure module, and columns are indexed by series.** `ingestRows` reads rows into typed columns without a DOM. The paint path reads a column by the series index it holds; a hover event looks the index up by key, so a series that registers between two ingests cannot read another series' column.
7. **Time ticks read d3-time directly.** `scaleTime` pulled in `d3-interpolate` and `d3-color`, which no chart reads. A seeded sweep of 4,000 domains pins the ticks and labels to `scaleTime`'s.
8. **The bump is `minor`.** The default surface and its `data-slot` change, so a selector or a test that reads the canvas breaks. The guide at `/migrations/0013-chart-svg-renderer-migration` carries the steps.

## Consequences

- Each chart family's static import graph is 51.3 KB gzip, and Bar, Line, and Area load no canvas code. ScatterPlot is 49.2 KB. Measured with rolldown 1.2.16 (minified ESM, React external, Node zlib gzip). The package build measured 54.5 KB before this change.
- On the www chart bench (`/bench/charts`, devbox Chromium 158 with SwiftShader, CPU ×1, DPR 2, median of 3 interleaved runs, `origin/main` against this change with every item above): 100 line cards took 225 ms of main thread at load instead of 824 ms, 25 ms for a data replace instead of 481 ms, and 315 ms for a hover sweep instead of 1,452 ms. 100 bar cards and a 100-row sparkline table moved by similar ratios. The list pages hold about 700 more DOM nodes and 3 to 5 MB more JavaScript heap, because each path and label is a node.
- A static or decorative SVG chart paints the same marks with no hover layers.
- The `far` band releases nothing for an SVG chart: it holds no bitmap.
- The engine is still one object per chart. The study's prototype kept no per-chart engine at all (one struct-of-arrays store per list); this change keeps the compound API and every engine feature (tweens, the edge fade, horizontal bars, textures, decimation) instead.

## Alternatives rejected

- **A canvas pool** (a fixed set of canvases moved to the charts near the viewport). It tied plain canvas at 100 cards, its 500-card gain came mostly from creating fewer empty canvas elements, and a reused canvas keeps two backing buffers.
- **A second, SVG-specific renderer.** Two copies of the bar, line, and area geometry drift. The recorder reuses `renderer.ts` as it is.
- **Lazy-loading the time-tick code.** Every line chart with dates would wait on a chunk before its first paint. Dropping `d3-scale` saved most of that code with no wait.

## Deferred (named, with the trigger that reopens each)

- **Hover layers created on first hover**, not at activation. Reopen when a list page's DOM size or style cost shows the three layers per chart.
- **A roving keyboard composite across a List** (arrows between cards and buckets, one Tab stop). Reopen when design settles the card keyboard model.
- **A synced cursor across a List.** Reopen when product asks for it.
- **SVG for ScatterPlot below a measured point count.** Reopen with a point-count crossover measured on a real GPU.
