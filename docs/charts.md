# Charts

Read this file before you change code under `packages/mantle/src/components/chart/` or in a chart family: `bar-chart`, `line-chart`, `area-chart`, `scatter-plot`, or `world-map`. One engine (`chart/engine.ts`) paints each family.

Each rule names its check: a test title and its file under `packages/mantle/src/components/`, or `review`. When a named test no longer exists, `chart/rule-checks.test.ts` fails. The numbers are in the [decision records](#decision-records), not in this file.

## Gates

A change that fails a gate does not ship.

- **Never change what assistive technology reads, or when it reads it, to save time.** Bring such a change to a maintainer as a decision, with its measured cost. Check: review. `the overlay's accessible description names the series and the keys, and the span stays in the reading order` in `chart/primitive.test.tsx` pins one decided case.
- **Give a faster path the same output as the path it replaces: keep the slow path as its test oracle.** Check: `returns the hit of a full scan for seeded random clouds and pointers` in `chart/scatter-engine.test.ts`.
- **Ship a speed change only when its gain is outside the spread between runs at a real page size, or when it removes lines.** First read the [decision records](#decision-records). Check: review.

## Frames and motion

[docs/motion.md](./motion.md) holds the motion rules of the rest of mantle, and each exception that it lists for a chart.

- **Ask for a frame only when a change needs one, so a chart at rest asks for none.** Check: `an engine at rest asks for no frame when it leaves the screen` in `chart/engine.test.ts`.
- **Play motion only on screen: for each motion, read the on-screen gate, which is `#tweenDuration()` in the engine and `host.animates()` in a `PointView`.** `#motionDuration()` knows only `animate` and reduced motion; a print opens the paint gate, not the on-screen gate. Check: `an engine in view but off screen paints a data update during a print settled, in one frame` in `chart/engine.test.ts`.
- **End each motion in the code that reports it as running.** A motion that `tick` reports ends in `tick`, by time or by distance; only a paint reports a fade that only a paint advances. Check: `$motion goes idle on a plot with no size` in `chart/engine.test.ts`; `a pulse ends by time on a map that never paints` in `chart/geo-view.test.ts`.
- **Start a tween only when a paint reads its values.** The engine jumps the x domain of a bar chart, and of a line or an area on a `point` scale that is not decimated. It holds no value tween for a world map. Check: `a line on a point scale that gains a category does not chase its x domain` and `a decimated line on a point scale that gains categories chases its x domain` in `chart/engine.test.ts`.
- **Stop a chase, which has no fixed end, when no mark is more than half a device pixel from its target.** Check: `an x-domain chase under half a device pixel of the plot width settles in one frame` in `chart/engine.test.ts`.
- **Skip each draw whose alpha is under `MIN_VISIBLE_ALPHA`, which changes no canvas pixel.** Check: `a series makes no draw call at a reveal of $at` in `chart/scatter-engine.test.ts`; review for the map and for 3D.
- **Make an equal input a no-op where it enters.**
  - A tween retarget. A finished tween holds its exact target, so an equal retarget after it starts nothing. Check: `a retarget to equal values after a finished tween stays settled` in `chart/tween.test.ts`.
  - A store publish. Check: `re-publishing the identical snapshot emits nothing (a pointer move must not re-render)` in `chart/store.test.ts`.
  - A theme signature. Check: `a rewrite that keeps the signature notifies nobody; a change notifies every listener once` in `chart/canvas-colors.test.ts`.
  - A size report, and an SVG attribute write. Check: review.

## Work for each frame and event

- **Repaint no mark for a hover or a key step: move the hover layers and the tooltip with a 2D `translate`.** A 3D rotation drag is the one pointer move that repaints. Check: `the engine moves $name with a 2D transform` in `chart/engine.test.ts` for the 2D form; review for the repaint.
- **Make draw calls and DOM nodes follow the series count, not the row count: one path for each series and one readout element for each chart.** A mark that needs its own path, such as a ringed scatter point, gets the fewest calls: a lone circle is one bare `arc`. Check: `` a ringed circle is its own path of one `arc`, with no `moveTo` `` in `chart/scatter-renderer.test.ts`; review for the series paths and the readout.
- **For each data update, derive each row value one time, into a column.** The engine calls a `PointView` one time for each frame or event, except `plots`, which a key step calls for each row that it scans. Check: review.
- **Where a decision sets a limit, keep the work of a frame from growing with the row count.**
  - Decimate a line or an area at `DECIMATION_ENTER_RATIO` rows or more for each device-pixel column. Check: `enters at 4 points per column` in `chart/decimate.test.ts`.
  - Run a value tween for each row only at `PER_DATUM_TWEEN_LIMIT` rows or fewer. Check: `an ingest of $rows rows copies $copies series columns into a value tween` in `chart/engine.test.ts`.
  - Thin the ticks before you measure text. Check: review.
  - Allocate nothing for each row in a frame. Check: review.
- **Add a cache only with a measured gain, after you look for a memo that already holds the value.** Check: review.
  - Key it on exactly the inputs that change its value.
  - Keep it in units that the frequent input does not change: data or projection units, not pixels.
  - Bound it when its keys come from data.
  - Give each key a behavior test for the stale case, such as `a dense line samples its marks at the new width after a resize` in `chart/engine.test.ts`.
- **Read style and layout one time for each pass, before any write.** Check: `one pass reads a custom property once for every series that paints it` in `chart/canvas-colors.test.ts`.
- **In a `ResizeObserver` callback, read the size and record it, then ask for a frame. Write the DOM in that frame from the recorded size, and read no size there.** The callback runs after layout, so the read there forces none. A write there can resize an observed box in the same pass. One read stays: a callout placement reads the plot offset one time, before its writes. Check: `a new readout size moves the tooltip on the next frame, not inside the observer callback` in `chart/engine.test.ts`; `a callout report asks the host for one paint, and moves no callout inside the call`, `a callout report places the callouts in the next paint, and in no paint after it`, and `a placement takes the size from the callout's report and reads no callout size` in `chart/geo-view.test.ts`.

## React and loading

- **Run the paint, the layout, the activation, and each overlay position outside React.** React renders the shell, the tooltip content, the legend, and the table; a hover does not render the legend again. Check: `a hover publish does not re-render the legend` in `chart/primitive.test.tsx`.
- **Compare a prop that has a value form by value before it reaches the engine.** The engine compares `data` and a function prop such as `tickFormat` by identity, so a new array or a new function paints the chart again. Check: `a re-render with an equal inline style resolves the colors once` in `chart/root-color-override.browser.test.tsx`.
- **Make no observer, media query, or frame request for one chart: use the shared services (`requestSharedFrame` in `chart/frame-loop.ts`, `observeChartVisibility` in `chart/visibility.ts`, and `observeResize` and the others in `chart/environment.ts`).** Check: `every request in one frame shares one animation frame and runs once` in `chart/frame-loop.test.ts`; review for a module that makes its own.
- **Mount a chart as a shell, and make each piece on first use.** Check: `a dormant chart is a shell: no paint surface, no hover layers, no tooltip surface` in `chart/primitive.test.tsx`.
- **Keep the module boundary of each family: no canvas, scatter, map, or 3D code in a family that does not run it.** Check: `of %s holds no canvas or scatter module` in `chart/import-boundary.test.ts`, and the other tests of that file.

## How to measure

[Explain the number](./principles/explain-the-number.md) is the principle. [apps/www/bench/README.md](../apps/www/bench/README.md#how-to-measure) has the method. For a chart:

- Time the routine that the engine calls, such as `drawScatterPoints`, not a loop that models it.
- Say what each number measures. A test or a script in Node counts frames, calls, and DOM writes, and it times only the chart's own JavaScript. Only a browser gives the cost of a canvas call, the raster, and the graphics processor (GPU) time.
- Time the raster by frame throughput, and read no pixel in the timed window.
- Compare two builds in interleaved rounds on one machine, and swap the order between rounds. Run no build or test beside them. Name the GPU and the basis of each size.

## Tests

Tests follow [docs/testing.md](./testing.md). For a chart:

- Count frames with `installFrameClock` (`chart/engine.test.ts`): `settle()` runs frames until no engine asks for one, and returns the count. It throws on a motion that does not end, so give each new motion one test that calls it.
- Assert the frames that an engine asks for, the paints, the DOM writes, or a forced layout read. Put each count behind a `// Why:` comment: the count is the one trace of the work.
- Never assert a time.

## Decision records

These are the performance and motion records. Read them before you reopen an option. Reopen a deferred item only on its trigger. Each record lists what was measured and not shipped, rejected, or deferred with the trigger that reopens it.

- [2026-07-18](../decisions/2026-07-18-canvas-chart-family.md): the engine design and its limits.
- [2026-10-08](../decisions/2026-10-08-chart-list-mount-cost.md): the dormant shell, and what assistive technology keeps.
- [2026-11-03](../decisions/2026-11-03-world-map.md): the map as a `PointView` of the engine.
- [2026-11-11](../decisions/2026-11-11-chart-svg-renderer.md): one surface for each family, and the shared services.
- [2026-11-12](../decisions/2026-11-12-chart-engine-optimization.md): the module boundary and the lazy pieces.
- [2026-11-13](../decisions/2026-11-13-chart-audit-pass.md): motion only on screen, and no d3 at run time.
- [2026-11-18](../decisions/2026-11-18-chart-rules.md): this file, the frames that painted nothing, and the cost of a lone circle.
