---
"@ngrok/mantle": minor
---

Add the canvas chart family: `BarChart` (`@ngrok/mantle/bar-chart`), `LineChart` (`@ngrok/mantle/line-chart`), `AreaChart` (`@ngrok/mantle/area-chart`), and `ScatterPlot` (`@ngrok/mantle/scatter-plot`).

Each is a compound component with a shadcn-style compositional shape (`Root`, `Grid`, `XAxis`, `YAxis`, series parts, `ReferenceLine`, `Tooltip`, `Legend`) rendered by a shared Canvas 2D engine built for scale: on-demand rAF commits (zero idle CPU), min/max-per-pixel-column decimation past 4 points per device pixel (O(plot-width) redraws at 100k+ points), DOM-overlay hover so pointer moves never repaint the canvas, and motion built for live data — x/y domains glide toward their targets with frame-rate-independent exponential chases (streaming appends read as continuous scrolling, never ease-stop-jump ticks), axis ticks/gridlines fade via per-label alpha instead of popping, and a liveline-style scroll mask dissolves exiting marks through a fade band at the plot's left edge while a sliding window streams (automatic; no prop). `prefers-reduced-motion` snaps everything.

`ScatterPlot` correlates two continuous measures — or three: providing `zKey` renders a rotatable 3D point cloud on the same Canvas 2D engine (drag to orbit, depth-sorted with gentle perspective, z carried through the tooltip, announcements, and the sr-only table). Hover hits the nearest point within 24px, and rendering degrades gracefully to tens of thousands of points. A `dimensions` prop (`1 | 2 | 3`) morphs the 3D cloud onto the x-axis line, the xy plane, or the full cube with the same glide — the interaction behind "watch the clusters separate" explainers. Scatter is an all-pairs chart form: the validated palette caps it at four series.

Highlights:

- New design tokens `--color-chart-1`…`--color-chart-8` and `--color-chart-other`, derived from mantle ramps and validated for colorblind-safe adjacency, normal-vision separation, and ≥ 3:1 surface contrast in all four themes (with Tailwind utilities like `bg-chart-1`). Color slots are sticky per `dataKey`, so filtering series never recolors the survivors.
- Interaction ships with `Root` unconditionally: snapped crosshair/hover band, an every-series tooltip, keyboard stepping (arrows, PageUp/PageDown, Home/End, Escape) with polite aria-live announcements, a bounded sr-only data-table twin, and datum activation via click or Enter/Space (`onDatumActivate`), plus controlled `activeIndex` for linked charts.
- The data-table twin is machine-readable: date row headers carry exact ISO timestamps in `<time dateTime>` and value cells carry raw numbers in `data-value`, so agents scrape precise series data from the DOM. A composable `CopyButton` part on every family copies the current rows to the clipboard as a machine-stable markdown table (ISO 8601 dates, un-separated numbers, em dash gaps).
- Configurable point glyphs: `shape` (`"circle" | "square" | "triangle" | "diamond"`) on `ScatterPlot.Point` (the marks themselves), `LineChart.Line` (canvas markers), and `AreaChart.Area` — a redundant encoding alongside color, sized for equal visual weight. Legend keys and hover dots wear each series' glyph on all three (line keys ride the glyph on a short stroke).
- Charts require an accessible name at the type level (`aria-label` or `aria-labelledby`).
- `pending` holds the previous render at reduced opacity during refetch — no skeleton flash.
