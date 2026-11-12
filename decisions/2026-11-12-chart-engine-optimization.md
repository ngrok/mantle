# Chart engine optimization pass

**Date:** 2026-11-12
**Status:** Accepted
**Amends:** items 5 and the "Deferred" list of [2026-11-11-chart-svg-renderer.md](./2026-11-11-chart-svg-renderer.md): the `List` part no longer shares a tooltip surface, and the hover layers arrive on the first hover.
**Evidence:** the www chart bench (`/bench/charts`), devbox Chromium 158 with SwiftShader, CPU ×1, DPR 2, animation off, median of 3 interleaved rounds. "Base" is `origin/main` at `3b38f8fa` plus the bench's `group=list` option; "branch" is this change. Sizes come from rolldown 1.2.16 over each package build on the devbox (frozen-lockfile install, minified ESM, React and Phosphor external, Node zlib gzip level 9).

## Context

After the SVG renderer, a review of the chart engine found five places where the charts were still larger or more complex than they had to be:

1. The `List` part moved one tooltip surface between its charts. That saved at most one empty `div` for each chart a reader hovered, and it caused three List bugs in one review round (lost context in a tooltip render prop, ownership moved by a data update, a stale announcement).
2. Bar, Line, and Area shared one `ChartEngine` with ScatterPlot, so each one shipped the scatter paint, the scatter hit test, the 3D camera and its rotation drag, the dimensions morph, and the cube frame.
3. Each interactive chart made its three hover layers when it activated, so a page of cards held three layers for each chart that nobody pointed at.
4. `primitive.tsx` held seven parts in about 2,300 lines.
5. Each chart keeps its own engine. The study behind the SVG renderer found that the engine is most of the per-chart cost.

## Decision

1. **A List shares one live region, and each chart keeps its own tooltip.** The holder store, the interaction ref, and the six handler calls are gone. The List keeps the shared `role="status"` region, because 300 interactive charts outside a List mount 300 regions at mount. A chart's tooltip surface reads the hover and the tooltip config through two selectors, not the whole snapshot, so a data update does not re-render the surface of a chart nobody points at.
2. **The scatter and 3D code loads only with ScatterPlot.** `scatter-engine.ts` holds a `ScatterView`: the camera, the camera and dimension tweens, the rotation drag, the projected-point buffers, the 2D and 3D paint, the hit test, and the keyboard screen position. `scatter-renderer.ts` holds the scatter draw routines. ScatterPlot passes `createScatterView` to its Root, and the engine calls the view once per frame and once per pointer event, never once per point. The other families pass nothing, so they build none of its tweens. `import-boundary.test.ts` walks each family's static import graph and fails when a canvas or scatter module comes back into Bar, Line, or Area.
3. **The engine makes the hover layers on the first active datum.** That is the first hover, the first keyboard step, or a controlled `activeIndex`. The engine appends the layers to the plot and removes them on `destroy`.
4. **One file per part.** `root.tsx`, `list.tsx`, `registration.ts`, `tooltip.tsx`, `legend.tsx`, `copy-button.tsx`, and `a11y.tsx`, with the context and the shared store hooks in `context.ts`. The Root's visibility gate, print activation, and description writer are named hooks, called in the same order as the effects they replace.
5. **The 3D code loads only for a chart with a `zKey`.** `scatter-3d.ts` (the camera, the camera and dimension tweens, the rotation drag, the projection, the hit test on projected points) and `scatter-3d-renderer.ts` (the depth-sorted cloud, the cube frame, its labels) form a separate chunk. The scatter view imports it the first time a chart with a `zKey` paints or takes a press, and it asks the engine for a repaint when the chunk arrives. Until then a 3D chart paints its plot empty. The dimensions morph uses the projection at every dimension count, so the trigger is `zKey`, not `dimensions === 3`.
6. **One engine per chart stays.** A list-level store needs a page budget to aim at, and design has not set one for the 300-card Agent v4 page. The cheap wins that need no budget are in items 2, 3, and 5.

## Consequences

- Bar, Line, and Area ship 48.3 KB instead of 50.6 KB (−2.3 KB). A 2D ScatterPlot ships 47.5 KB instead of 48.3 KB (−0.9 KB). A 3D ScatterPlot loads 50.0 KB (+1.7 KB): the 2D graph plus the 2.6 KB 3D chunk. Two chunks compress less well than one, and the `ScatterHost` closures and the calls through the view cost more than the inlined code did.
- On 100 2D scatter cards (base against the branch with item 5), mount, main-thread time at load, the replace, the hover sweep, and the heap stayed inside the spread between runs, and no page logged an error.
- The split moves no logic. The minified chart chunk is the same size, byte for byte, and its gzip size changes by 0.1 KB, because the modules sit in a different order.
- The List gate measurement (100 and 300 line cards in a List, a hover sweep over the first 20 cards, base against item 1 alone): mount, main-thread time at load, and the hover sweep stayed within run-to-run noise, and the page held 19 more DOM nodes after the sweep (one empty surface for each hovered chart after the first). A data replace on 300 cards cost about 8 ms more, because each kept surface re-rendered on every store publish. After the selectors in item 1, the final bench measured that replace at 60 ms on the branch and 57 ms on base, with base runs from 55 to 63 ms.
- Runtime did not move. On the final bench (base against the branch before item 5; 100 and 300 cards of line and bar charts, each with and without a List, a 20-card hover sweep, a 100-row sparkline table, and 100 2D scatter cards), mount time, main-thread time at load, the data replace, the window shift, and the hover sweep stayed inside the spread between runs. The largest median moves were about 5% each way, and the script time inside the scatter hover sweep, for example, was 296 to 301 ms on base and 300 to 304 ms on the branch.
- An active interactive chart holds three fewer DOM nodes until a reader points at it: 36 fewer nodes at load on every list page, where 12 charts activate. After a 20-card hover sweep, a page without a List holds 9 fewer nodes, and a page with a List holds 10 more (the per-chart tooltip surfaces).
- A test that reads a hover layer before any hover finds nothing. No caller in `ngrok-private/frontend` reads the layers or uses a `List`.

## Alternatives rejected

- **Keep the shared tooltip and move the List state into a reducer.** The plan's fallback if the gate measurement showed a gain. It did not, and a reducer keeps the event inference that caused the bugs.
- **A separate 3D entry point** (`ScatterPlot3D` or a `scatter-plot-3d` subpath). A 3D chart would paint with no wait, but `zKey` and `dimensions` would leave `ScatterPlot`: a breaking `minor` and a migration guide for 1.5 KB.
- **A scatter subclass of `ChartEngine`.** CONVENTIONS.md rules out inheritance, and a subclass still puts the base class's scatter hooks in every family.

## Deferred (named, with the trigger that reopens each)

- **A list-level store** (one struct-of-arrays store for each List). Reopen when design sets a main-thread budget for the 300-card page and the page is over it.
- **A roving keyboard composite across a List.** Reopen when design settles the card keyboard model: one Tab stop across the cards, or one for each card.
- **A synced cursor across a List.** Reopen when product asks for it.
