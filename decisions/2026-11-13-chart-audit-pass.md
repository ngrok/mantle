# Chart audit pass

**Date:** 2026-11-13
**Status:** Accepted
**Amends:** [2026-07-18-canvas-chart-family.md](./2026-07-18-canvas-chart-family.md) (d3 is no longer the math authority at run time), [2026-10-08-chart-list-mount-cost.md](./2026-10-08-chart-list-mount-cost.md) (motion follows the screen, not the near band; one activation slice for each delivery), items 3 and 5 of [2026-11-12-chart-engine-optimization.md](./2026-11-12-chart-engine-optimization.md) (the hover layers move with 2D transforms; a failed 3D load retries), and item 7 of [2026-11-11-chart-svg-renderer.md](./2026-11-11-chart-svg-renderer.md) (time ticks no longer read d3-time).
**Evidence:** the www chart bench (`/bench/charts`) on the devbox: Chromium 158 with SwiftShader, CPU ×1, DPR 2, median of 3 interleaved rounds. "Base" is `df09bfc7`, the branch before this pass. Hover figures come from `bench:hover` traces (main-thread task time for each pointer move). Layer counts come from the DevTools protocol (`LayerTree.compositingReasons`). Sizes come from rolldown 1.2.19 over the package build on one machine: minified ESM, React and Phosphor external, Node zlib gzip level 9. "Chart-only" also leaves out `cx`, `Button`, `Slot`, and the icon modules, which an app that uses mantle loads already.

## Context

An audit of the chart family asked five questions: are the charts at a local maximum, can the code split further, does mantle need its own tooltip library, what is missing, and how good is the accessibility. Nine readers took one subsystem each, and six more took the tooltip, the feature gaps, and the next architecture. They returned 88 findings. The devbox then measured the ones that claimed a cost.

Three results set the direction:

1. **The mark renderer is at a local maximum.** One SVG path for each series, colors left to CSS, and a hover that repaints no mark: no renderer swap on the list beat it.
2. **The bytes were not.** d3 was 8.3 KB of the 45.1 KB (gzip) that a chart family costs an app, and a bar chart ran none of it.
3. **The hover cost on the Agents page was not in the charts.** On 100 agent cards a pointer move cost 9.7 ms of main thread, and 5.7 ms of that was one compositing step (`Layerize`) over the whole page. The page held 135 compositor layers. 130 of them belonged to the hidden loading spinner of each card's `IconButton`: a paused CSS animation still gets a layer in Chromium, and so does the icon that paints over it.

## Decision

1. **Charts ship no d3 code.** `curve.ts` ports the line and area generators and three curves of d3-shape. `time-ticks.ts` ports the local time intervals and the tick solver of d3-time and the tick label rule of d3-scale. The d3 packages stay as dev dependencies, and tests use them as the oracle: each path call and each tick must be equal, to the last bit. `d3-license.md` holds the license of the ported code, and the package publishes it.
2. **An inactive `IconSwap` icon is `visibility: hidden` when its exit ends.** The `visibility` transition holds the outgoing icon visible while it fades, so the swap looks the same. A hidden icon paints nothing, so the browser makes no layer for it.
3. **The hover layers move with 2D transforms.** A `translate3d` gave each hovered chart up to four layers, and one of them was an overlap layer 480 by 8,404 px on the 100-card page. A 2D `translate` makes none.
4. **Motion runs only on screen.** The engine holds an on-screen flag beside its near-band flag. A chart that is near the viewport but off screen paints an update settled. A chart that leaves the screen in the middle of a glide settles with one paint.
5. **The domain chase settles on pixels.** The chase stops when every mark is within half a device pixel of its target. A bar chart jumps its x chase, which no bar reads.
6. **A per-datum tween needs the same categories.** On a band or point scale, the engine tweens values only when each category is equal to the one before it. A window that slides by one bucket snaps.
7. **The keyboard and the pointer take only what they use.** A chord with Alt, Ctrl, or Meta passes to the browser. The chart handles Escape, Enter, and Space only while a datum is active. Only the primary button activates. On horizontal bars the down and up arrow keys step the categories.
8. **A print paints settled frames.** Labels and gridlines print at full opacity.
9. **Forced colors keep the focus and the cursor.** The overlay and the legend use mantle's focus pattern, which leaves an outline in forced-colors mode. The crosshair, the hover band, and the hover dots keep a visible form.
10. **Assistive text follows the plot.** The table and the Markdown copy read a time scale as dates. An announcement follows a keyboard step, not a data update, and it uses the Tooltip part's formats and the Total.
11. **Mantle does not build a tooltip library.** The chart readout is one element for each chart. The engine places it, with no Radix code. The slow shape is one Radix tooltip for each bucket: 26.4 ms for each pointer move against 3.5 ms for `BarChart` on 20 agent cards. Ordinary tooltips open one at a time and stay on Radix.

## Consequences

- A Bar, Line, or Area chart ships 52.3 KB in place of 59.6 KB on `main` (−7.4 KB, −12.4%), and its chart-only code is 38.9 KB in place of 45.9 KB. A 2D ScatterPlot ships 51.8 KB in place of 57.4 KB.
- On 100 agent cards with animation on, base against this pass: main-thread time at load fell from 428 ms to 329 ms, a data replace from 358 ms to 112 ms, a window shift from 823 ms to 242 ms, and a hover sweep over 12 cards from 4,572 ms to 1,615 ms. One pointer move costs 4.2 ms of main thread in place of 9.9 ms. On 20 cards it costs 2.7 ms in place of 3.5 ms.
- The 100-card page holds 5 compositor layers at load in place of 135, and a chart that a reader pointed at keeps none.
- The JS heap after a forced collection stayed the same (11.3 MB and 11.1 MB). A heap figure read with no collection first rose 21% with animation on, because less work runs fewer collections before the read.
- A 100-row table of static sparklines stayed inside the spread between runs on every metric.
- The fixes from the review of this pass changed no timing. In two A/B runs against the commit before them, one in each order, the mean difference was under 3% on each metric. The run that went first in a pair was the faster one, by up to 16%.

- The text of a line or area `d` attribute changes: two decimals and spaces, where d3 wrote three decimals and commas. The largest difference over 120,000 paths is 0.005 px.
- A chart that scrolls into view in the middle of an update shows the settled data.
- A reader no longer hears a value that changes under a parked keyboard cursor. The next step reads the new value.
- A test that parses a hover layer's `transform` must read `translate(…)`.

## Measured and not shipped

- **Layers released while idle** (the hover layers drop their transform when no datum is active): no change in hover time while the spinner layers were on the page.
- **No clip on an edge-to-edge chart** (the marks clip equals the SVG box): 2% less `Layerize`, inside the spread between runs.
- **A tooltip with a fixed width, and one that never narrows during a hover:** no change. The full compositing step ran with no tooltip at all.
- **The readout on the mantle `Popover`** (non-modal, a virtual anchor, floating-ui polling): about 0.8 ms more main-thread time for each pointer move at both page sizes (4.15 ms to 4.96 ms on 100 cards, 2.78 ms to 3.63 ms on 20), and a poll 60 times a second while the pointer rests. The raster thread did 45% less work, so over all threads the cost is 0.6 to 0.7 ms. Bytes do not decide it: `Popover` is already on 17 of the 28 dashboard routes that hold a chart. Two effects that no prop removes decide it. The focus scope of the popover lets Tab leave a modal `Dialog` while a readout shows, and the portal drops a `--color-chart-*` override that an app sets on the chart Root.
- **A `viewBox` for print:** headless Chromium (`page.pdf()`) repaints each chart at the print width, with and without it. A print from the browser's own dialog was not measured.

## Deferred (named, with the trigger that reopens each)

- **Marks for each family through the factory seam** (`BarChart` ships no line, area, or decimation code): 2.7 KB gzip off `BarChart`, 1.9 off Line and Area, 3.8 off `ScatterPlot`, measured by deleting the code in memory. It moves five methods out of a 3,000-line class. Reopen with the next change that touches the paint path of more than one family.
- **The React Compiler output of the Root** (2.7 KB gzip of cache checks, about 220 slots for each chart): an exception to a repo-wide rule. Reopen when the owner of that rule wants the A/B.
- **An SVG chart that returns to its shell far from the viewport.** After one full scroll every chart keeps its engine and its SVG. Reopen with the page budget that the list-level store waits on.
- **A dense bar chart that merges bars under one device pixel.** Reopen when a page draws more than about 2,000 bars in one chart.
- **One path for each scatter series from 5,001 to 20,000 points, and a counting sort for the 3D depth order.** Reopen when a page draws a scatter above 5,000 points.
- **A readout that leaves the plot** (the top layer, with `popover="manual"`): on an 80 px chart the readout covers the bars, and a card can clip it. It needs a placement from design.
- **A readout that a reader pins or acts in.** That is the use of the mantle `Popover`: open it from `onDatumActivate` and place it one time with `Popover.Anchor virtualRef`. The chart needs a seam that gives the anchor point of the active datum, about 20 lines. Reopen when a page needs a link or an action in the readout.
- **Touch:** a tap shows the readout only while the finger is down, and one tap inspects and activates. It needs a model from design.
- **Escape inside a mantle Dialog** closes the dialog and not only the readout, and a readout that a pointer opened cannot be dismissed from the keyboard. Both need a contract between the chart and the dialog layer.
- **3D rotation from the keyboard** and from a pointer with no drag (SC 2.1.1 and SC 2.5.7).
- **Units, the stacked Total, and reference lines in the data table and the description.** The announcement has the formats now; the table needs a decision, because it would render again on each new formatter.
- **One keyboard sentence for a List**, in place of one for each chart: it changes what browse mode reads.
- **A UTC time axis, an explicit x domain, one value format with units, a percent stack, and a range select:** the five gaps that the dashboard and peer libraries share. Each is a feature, not a fix.
