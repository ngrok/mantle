# Chart rules, and the frames that painted nothing

**Date:** 2026-11-18
**Status:** Accepted
**Amends:** items 5 and 8 of [2026-11-13-chart-audit-pass.md](./2026-11-13-chart-audit-pass.md) (a line or an area on a point scale jumps its x chase too; a print opens the paint gate and not the motion gate), and [2026-11-03-world-map.md](./2026-11-03-world-map.md) (a callout report places in the next paint).
**Evidence:** two methods. **Counts** come from the real `ChartEngine`, `ChartStore`, SVG backend, and point views in Node 26, with a fake DOM and a 60 Hz frame clock that the script steps by hand, one process for each tree. "Base" is `0dbaf41b`, the branch before this work. Node gives no layout, no raster, and no time for a canvas call. **Point draw times** come from one page of headless Chromium 158 on an Apple M3 Max (Metal) that holds the `drawScatterPoints` and `drawDepthSortedPoints` of both trees: a 960 by 400 canvas at a device pixel ratio of 2, timed by frame throughput (N paints in one animation frame, the frame interval divided by N, no pixel read), median of 4 interleaved rounds with the order reversed in each second round. The frame interval moves in steps of one display frame, so each time has a step of 0.3 to 0.5 ms.

## Context

An audit of `WorldMap` left ten lessons. Two questions followed: which lessons apply to the other chart families, and which rules must become canonical. Four readers checked the lessons against Bar, Line, Area, and ScatterPlot on the real engine, and a second reader tried to refute each finding.

Most lessons did not transfer. The passes of 2026-11-12 and 2026-11-13 tuned those families already. Five small defects did transfer. A sixth came from a timing of the real point routine: the audit had timed a model loop that left out one canvas call.

The rules of the family were in six dated records, in code comments, and in private notes. No file told a person or an agent which rules a chart change must keep.

## Decision

1. **[docs/charts.md](../docs/charts.md) is the rule file of the chart family.** `packages/AGENTS.md` routes to it, and so do `docs/motion.md` and the header of `chart/engine.ts`. Each rule names the test that fails when the rule breaks, or the word review. `chart/rule-checks.test.ts` fails when a named test no longer exists. The file holds no dated number: the records do. The rules on how to measure are in `docs/principles/explain-the-number.md` and `apps/www/bench/README.md`.
2. **A finished value tween holds its exact target.** `from + (to - from)` misses `to` by one rounding step for about 15% of pairs of one-decimal values. The retarget guard compares the new target with the held value, so the next update with equal values read as a change.
3. **A line or an area on a point scale jumps its x chase,** as a bar chart does: the band layout places each mark, so no paint reads the x domain. A scatter plot and the columns of a decimated series read it, and they keep the chase.
4. **A print opens the paint gate, not the motion gate.** A chart that is not on screen paints each update settled, also between `beforeprint` and `afterprint`. A chart on screen keeps its motion.
5. **A resize and a ratio change keep the decimation cache.** Its key holds the x domain and the column count, so a new width or a new ratio misses the cache without a clear. The clear at ingest stays: the key does not hold the data.
6. **A lone circle is a bare `arc`.** The circle tracer starts with a `moveTo`, which the one path of `drawMarkers` needs. The per-point loops of the 2D and 3D scatter called the same tracer after their own `beginPath`, and Chromium records an `arc` after a `moveTo` as a general path. The loops now call `arc` for a circle and the tracer for each other glyph.
7. **A callout report places in the next paint.** `WorldMap.Callout` reports from its ref callback and from a `ResizeObserver` callback. The view records the report and asks for a paint, and one placement reads the size of each callout before it writes to any callout.
8. **The docs say that an axis compares `tickFormat` by identity.** A function has no value form to compare, so there is no guard. An app that the React Compiler compiles keeps an inline function stable.

## Consequences

Counts, base against this work:

| Case                                                                               | Base                         | This work           |
| ---------------------------------------------------------------------------------- | ---------------------------- | ------------------- |
| An update with equal values, right after a data replace (Bar, Line, Area, Scatter) | 17 frames, 17 paints         | 1 frame, 1 paint    |
| The same update on 100 card charts, 12 on screen                                   | 212 paints                   | 36 paints           |
| One category more or fewer on a point-scale line or area, labels unchanged         | 18 frames, 17 equal pictures | 1 frame             |
| Three categories fewer, labels unchanged                                           | 23 frames, 22 equal pictures | 1 frame             |
| A data update in the print window on a chart off screen, or far from the viewport  | 32 to 37 frames              | 1 frame             |
| A data replace on 100 card charts in the print window                              | 2,663 paints                 | 390 paints          |
| A height-only resize of a dense line of 10,000 or 100,000 rows                     | 1 pass over all rows         | no pass             |
| Three callouts that report in one observer pass                                    | 3 placements in the callback | 1 in the next paint |
| Size reads after a write, in one placement of three callouts                       | 4                            | 0                   |

Point draw times for one paint, base against this work:

| Points                                     | Base    | This work |
| ------------------------------------------ | ------- | --------- |
| 2D, 1,000 circles with rings               | 0.98 ms | 0.52 ms   |
| 2D, 5,000 circles with rings               | 4.69 ms | 2.47 ms   |
| 2D, 5,000 sized circles with rings (a map) | 4.69 ms | 2.34 ms   |
| 2D, 10,000 circles, no ring                | 6.25 ms | 2.34 ms   |
| 2D, 20,000 circles, no ring                | 12.5 ms | 4.43 ms   |
| 3D, 5,000 circles with rings               | 4.69 ms | 2.34 ms   |
| 2D, 5,000 squares with rings (control)     | 4.17 ms | 4.17 ms   |

- The time of a point paint is canvas call time, not raster: the script time alone is within 15% of each figure. The `moveTo` came with #1683 on 2026-11-11.
- A round point paints as it did before #1683, with the antialiasing of a circle and not of a general path. Of 1,536,000 pixels in a paint of 5,000 points, 146,405 differ from the base. A square paints the same pixels.
- The first case needs a replace: after an update that moves each value by less than a factor of 2, `to - from` is exact, and the base took 1 frame too. The base lost one 17-frame run for each such replace.
- A settled picture can differ from the base by 0.01 px in a path coordinate: 14 of 9,429 settled states of a seeded random walk over 180 charts. In each of the 14, this work equals a newly mounted chart with the same inputs, and the base does not. The base kept the rounding step of its last tween until the next data update.
- A callout report now costs one paint of the map canvas, where it cost none. The reports of a mount arrive with the first plot size, so they add no paint there. A map that is far from the viewport places its callouts when it comes into view.
- No count here shows that a browser runs animation frames while its print dialog is open. If it runs none, the base played the motion after `afterprint`, and this work plays none.

## Measured and not shipped

- **One path for each series of points with rings.** A model loop takes 1.17 ms for 5,000 points against 4.69 ms. Each ring then cuts through the dots under it, where a point drawn alone covers them. The look decides it.
- **One image for each point (`drawImage`), and one `fillRect` for each small point.** Both are slower than the path calls in a model loop: 5.21 ms against 4.69 ms for 5,000 points, and 12.5 ms against 2.86 ms for 50,000.
- **Line and area geometry in data units, placed with a transform** on a resize or a domain chase. It saves the path text of a frame (about 0.1 ms of script for a line of 1,000 rows) and not the raster: the browser strokes a path again under a scale that is not uniform. Bars, markers, value tween frames, and a decimated series get nothing. The estimate is 150 to 250 lines and a second form of geometry in the paint seam.
- **Seven smaller items:** a stream glide that skips a frame which moves no mark, no frame for a pointer move that changes nothing, one paint less at first sight, a reveal clip that the frames reuse, a data table that skips an update, a key check in one pass, and two small memos. Each saves microseconds, or runs one time in the life of a chart. The stream skip also makes a slow scroll rougher at a device pixel ratio of 1.

## Deferred (named, with the trigger that reopens each)

- **End a value tween and a reveal by pixel distance,** as the domain chase ends. A small change on an agent card takes 7.4 paints in place of 17. The last step grows from 0.01 px to 0.4 or 0.6 px, so the motion stops harder. It needs a look from design and a bench case that moves each value by about 2%.
- **Keep the marks on a frame that only a label fade asked for.** After the marks stop, 22 to 26 more frames build each series path again (SVG) or draw each point again (ScatterPlot). The SVG saving is 0.1 to 0.9 ms of script for each event at dashboard sizes. A first prototype kept old marks on a plot with no size. Reopen with a bench scene of one dense chart with axes.
- **Shorter number text in the SVG recorder.** Number-to-text is about half of the script of an SVG frame, and three encodings cut 25 to 56% of it, which is 14 to 30 µs for each frame at dashboard sizes. Reopen when a bench of 100 and 300 bar cards shows a gain outside the spread between runs.
- **One path for each scatter series with no ring** (5,001 to 20,000 points). On top of the bare `arc` it takes 1.43 ms in place of 2.34 ms at 10,000 points, and overlaps no longer darken in a fade. The trigger of 2026-11-13 stands: a page that draws a scatter above 5,000 points.
- **An equal retarget while a tween is in flight** starts the ease again: 25 frames in place of 17. A compare with the tween's target, as `ChaseTween.aim` does, changes the timing of a real retarget in flight. Reopen when a page polls faster than the update tween.
- **A new chart decimates at the exit ratio.** The first ingest decides against a plot with no width, so a chart with 3 to 4 rows for each column starts decimated and stays so. Reopen with the next change to `decimate.ts`.
- **One view call for a key step.** The engine calls `plots` for each row that a key step passes: 0.15 ms for 1,000 rows outside a map's region. Reopen for a map above 20,000 rows.
- **No motion on a plot with no size.** Each motion ends by time there, with no paint. A `#tweenDuration()` of 0 for such a plot removes those frames. No page is known to hold a chart with no size in view.
