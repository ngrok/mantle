# Charts mount dormant and engage on focus

**Date:** 2026-10-08
**Status:** Accepted
**Scope:** `packages/mantle/src/components/chart/{primitive.tsx,engine.ts,colors.ts,visibility.ts,describe.ts}`, every chart Root (`LineChart`, `BarChart`, `AreaChart`, `ScatterPlot`), `packages/mantle/vitest.setup.ts`, `packages/mantle/src/test-utils/mock-intersection-observer.ts`, `packages/mantle/src/test-utils/engage-chart.ts`
**Amends:** two items of [2026-07-18-canvas-chart-family.md](./2026-07-18-canvas-chart-family.md): "Theme-token colors resolved at runtime via a probe element per chart root", and the sr-only data table in "Interaction is Root's unconditional contract"
**Evidence:** `apps/chart-bench`, 100 line charts of 2 series × 30 points, each 558×314 CSS px, DPR 2, headless Chromium 153 through Playwright, Apple M3 Max, medians of 3 runs. We measured the baseline below on `main` for this change; `apps/chart-bench/REPORT.md` (2026-10-07) holds the comparison with `@tanstack/charts` that prompted the work.

## Context

A dashboard lists charts: one per endpoint, one per domain, one per tenant. The chart family was built for one dense chart, where the engine's decimation keeps a 100,000-point line inside the frame budget, and it was never measured as a list. The bench measured it against `@tanstack/charts`, and the list case was the one mantle lost.

The baseline on `main`, 100 line charts: mount 294 ms, main thread 371 ms, style recalculation 177 ms, and Total Blocking Time 173 ms at 1× CPU; mount 1,192 ms at 4×. Each chart held 171 DOM nodes, 162 of them the sr-only data table and its instructions span, and the 100 canvases held 535 MB of backing store. A reader sees four of those charts.

Two costs made up the mount time.

1. **Color resolution forced 17 style recalculations per chart.** `resolveThroughProbe` appended a `display: none` span to the Root, read `getComputedStyle(probe).color`, and removed it, once per color. Each insertion invalidated the Root's sibling-dependent styles and recalculated the whole chart subtree, table included: 1,704 recalculations for 100 charts, 177 ms at 1× and 765 ms at 4×. Seventeen rather than eight, because the first commit ran before the resize observer delivered, so `#dpr` was still `1`; the resize then changed the color-cache signature, and every color resolved a second time. The tooltip's `ResizeObserver` added one forced layout through its `offsetWidth` read.
2. **Every chart paid its full cost at mount.** Each Root rendered its data table, resolved its colors, measured its axis labels, allocated a 1116 × 628 canvas bitmap, and painted, whether or not a reader could see it.

`content-visibility: auto` on the list's cards cut mount to 85 ms and canvas memory to 120 MB with no library change, which showed where the floor was. It is an app-side fix, and on the Root itself it clips the focus ring and the tooltip, so the component needed its own gate.

## Decision

### 1. Colors resolve from one computed-style read

`createColorResolver` reads `getComputedStyle(root)` once per resolution pass. The computed value of a custom property arrives with every `var()` substituted, and the canvas parses the `oklch()` and `color-mix()` strings mantle's tokens resolve to, so `getPropertyValue("--color-chart-1")` on that one declaration resolves a series color inside the Root's own cascade. A root-scoped `--color-chart-N` override wins exactly as before. A bare `currentColor` resolves from the Root's computed `color`. `canvasParses` checks each candidate against one 1×1 canvas context per document, and only a value the canvas rejects (a nested `var()` left by a fallback, a `currentColor` nested inside another function such as `color-mix()`, `light-dark()`) goes through the probe, which is now one hidden span per Root, mounted once and restyled. The constructor seeds `#dpr` so the first pass signs the cache with the real ratio, and the tooltip observer starts when the chart enters view. `observeThemeChanges` shares one `MutationObserver` per document and compares a signature, so a same-value attribute rewrite re-resolves nothing.

### 2. A Root mounts dormant and engages on focus

Every chart Root carries an engagement latch. It starts `false`. It flips to `true` when focus lands anywhere inside the Root: the interaction overlay is the Tab stop, and a focusable part composed inside the Root, such as `CopyButton`, counts too. It never flips back. Visibility never flips it: a chart that scrolls into view paints, and it mounts no table. The Root stamps `data-state="dormant"` then `data-state="engaged"` after the props spread, so a consumer value cannot override it. The sr-only data table mounts on the flip and stays, so a table a screen reader is on never unmounts under its cursor. Focus engages synchronously in the `focus` handler, because the table must exist before the screen reader moves past the overlay, and a discrete event flushes the state update before the next key arrives. A decorative chart renders no table and carries no `data-state`: it has no overlay, so focus can never engage it. It paints on the same visibility gate.

The table follows focus and not visibility because of the list page. It renders a sparkline chart in every table cell, two per row, forty in view at once. A table that mounted on visibility would add thousands of nodes nobody asked for (a 30-row table is about 160 nodes, and forty of them are over 6,000), and a screen reader navigating that list would meet a nested table inside every cell. The always-rendered description (§4) names the kind, the count, the x range, and the series; Tab into a chart gives the full table; the keyboard point cursor reads every value.

### 3. Paint, text measurement, color resolution, and the canvas wait for visibility

`visibility.ts` holds one trio of `IntersectionObserver`s per scroll root: a `visible` band at the viewport, a `near` band at `rootMargin: 100%`, and a `far` band at `300%`, all with `scrollMargin`, so a chart inside a scrolling panel paints when it nears the panel's clip rather than when the panel reveals it. On an engine without `scrollMargin` (probed once), the trio roots at the chart's nearest scroll container instead. The `near` band drives `engine.setInView`; the `visible` band drives `engine.markSeen`; leaving the `far` band calls `engine.releaseBackingStores`, which zeroes the canvas and the marks layer and marks the chart for a full repaint on return. An out-of-view commit still ingests, and it runs layout once per data or size change (never per hover frame), but it skips color resolution, text measurement, and paint, and the engine creates its 2D context on first use rather than in the constructor. A dormant engine also holds settled state: every tween jumps instead of gliding, so entry paints the current data at once instead of gliding from a domain nobody saw. Focus inside a chart also lets it paint, so a chart focused with `preventScroll` is not blank. `beforeprint` paints every chart synchronously, because no animation frame runs before the print snapshot, and `afterprint` releases the ones out of view. The enter reveal of every series holds at zero until the `visible` band reports the chart on screen, so a chart painted one viewport ahead draws its marks as the reader reaches it; a print snaps the reveal to full. The reduced-motion query, the device-pixel-ratio watcher, and the print listener pair live once per window (`environment.ts`), not once per chart. A chart still throws the `dataKey` and `xKey` invariants in its first commit, in view or not, and it ingests before it paints, so the keyboard works from the first Tab.

### 4. A described overlay replaces the instructions span

The overlay's `aria-describedby` now points at one always-rendered sr-only span, `data-slot="<kind>-description"`, whose text `describeChart` composes: the chart kind, the number of data points (categories on a bar chart), the x range from first to last (`at X` for one point), the series labels, and then the unchanged keyboard instructions. A dormant chart has no table, so this sentence is what a screen reader gets from it. The span renders one string child, so React writes it with `textContent` and a browser translation engine cannot detach it. Server HTML carries the plain count alone. The range waits for hydration, because `Intl` output differs by locale, and the series labels register in layout effects, so both render on the client.

### 5. The live region stays

The polite `role="status"` region mounts with the Root, as before. A region inserted right before its first message is not announced.

### 6. The test contract

`packages/mantle/vitest.setup.ts` installs `createIntersectionObserverStub({ intersecting: true }).Observer` as the global under happy-dom, by direct assignment, because `unstubGlobals` would undo a `vi.stubGlobal` there before the first test. Every happy-dom chart test therefore sees a painted chart at mount, as it did before, and no table until it focuses the chart. `engageChart()` in `packages/mantle/src/test-utils/engage-chart.ts` focuses the overlay inside `act`; a consumer suite does the same with `await user.tab()` or `element.focus()` inside `act`, then `findByRole("table")`. A test that needs an unpainted chart stubs its own observer with `intersecting: false` and drives `enter` and `leave`. jsdom has no `IntersectionObserver`, so `observeChartVisibility` reports both bands in view at once, and a chart there paints at mount. The browser project keeps Chromium's observer.

## Consequences

- **Measured result (2026-10-08, same bench, medians of 3, `animate={false}`):** 100 line charts mount in 64 ms at 1× (from 294) with 119 ms of main-thread time (from 371), 4 ms of style recalculation (from 177), Total Blocking Time 0 (from 173), and a worst frame of 17 ms (from 250); at 4× they mount in 194 ms (from 1,192) with TBT 39 ms (from 980). The page holds 1,393 DOM nodes (from 17,135), 14 per dormant chart, and 158 MB of canvas memory after a full scroll (from 535). One chart alone mounts in 53 ms and ten in 58 ms, so the 99 extra charts cost 12 ms of mount and 37 ms of main-thread time. 100 bar charts: 60 ms at 1× (from 153), 177 ms at 4× (from 658). A table of 100 rows with two 112×24 sparklines each (200 charts): 89 ms at 1× (from 207) with TBT 0 (from 73) and 3,170 DOM nodes (from 10,126); 369 ms at 4× (from 829) with TBT 153 ms (from 635). The target was mount near 50 ms at 1×, TBT 0, about 11 DOM nodes per dormant chart, and canvas memory for the visible charts alone.
- **One accepted regression:** a screen reader's table list (quick navigation by table) names only the charts a reader has focused. A reader who tabs to a chart engages it; a reader who scrolls past it, or who lists tables before tabbing to any, sees fewer tables than the page holds. The description on every overlay names what each chart holds, focused or not.
- **A `minor` bump.** A test that queries the table at mount and an agent that reads it from the DOM both depend on a documented behavior that changed. The changeset carries the migration: focus the chart (`user.tab()`, or `element.focus()` inside `act`) and then query the table in a test; focus and wait for `data-state="engaged"`, or use `CopyButton`, for an agent.
- **`content-visibility: auto` is a complement, not a substitute.** The docs recommend it on list cards: it skips style and layout for offscreen cards, and the chart's gate already skips paint and canvas memory.
- `data-state` and `<kind>-description` are public API on every interactive Root, documented in the JSDoc and in the four API references.

## Alternatives rejected

- **A page-level color cache** keyed by theme signature: it cannot see a root-scoped `--color-chart-N` override, which the docs promise.
- **`content-visibility: auto` on the Root:** paint containment clips the focus ring and the tooltip, which overflow the Root.
- **Mounting the table on visibility,** with the paint gate: a list page renders a sparkline in every table cell, two per row, forty in view at once, so the tables nobody asked for add thousands of nodes, and a screen reader navigating the list meets a nested table inside every cell. The description names what each chart holds, Tab gives the table, and the point cursor reads every value.
- **An `innerHTML` twin** written outside React: it keeps the node count, which is the cost.
- **A shared instructions element** for every chart on the page: the description is per chart (its kind, count, range, and series), so a shared element could carry only the keyboard sentence, it saves one node of 171, and it needs a page-level owner that a self-contained Root does not have.
- **Lazy engine construction** on engagement: it saves about 0.2 ms per chart and loses the fail-fast invariants at mount.
- **A lazy live region** mounted on engagement: a region inserted right before its first message is not announced.
- **The persistent-probe fix alone** (`bench/probe-fix.patch`): it halves mount time but still forces one recalculation per color, because restyling the probe recalculates that span.

## Deferred (named, with the trigger that reopens each)

- **A budgeted frame scheduler** that spreads first paints across frames. Reopen if an all-in-view grid of 12 or more charts shows a first-paint frame over 50 ms at 1×.
- **Idle mounting of every table**, so a page eventually holds every twin. Reopen if a scraper needs every table without focusing each chart.
- **`hidden` description spans** in place of `sr-only`, so browse mode does not read a description twice. Measured on 2026-10-08: `hidden` cut layout from 19 ms to 13 ms per 100 line charts at 1× and nothing else. Kept `sr-only`, so the description stays in the browse-mode reading order. Reopen if browse-mode duplication is reported.
