# Chart mount benchmark

The drivers in this directory load `/bench/charts` (see `app/routes/bench.charts.tsx` and
`app/features/chart-bench/`) in headless Chromium through Playwright and read the main thread
through CDP. The page is linked from the Bar Chart docs page, under "Lists of charts".

## Scenarios

The page reads one scenario from its query string. The form at the top of the page picks a
variant and loads the page again with the new query, the way the driver does:

| param      | values                           | meaning                                                                        |
| ---------- | -------------------------------- | ------------------------------------------------------------------------------ |
| `animate`  | `1`, `0`                         | whether the charts play their mount animation; `0` sets `animate={false}`      |
| `kind`     | `line`, `bar`, `area`, `scatter` | the chart family                                                               |
| `mode`     | `list`, `dense`, `table`         | `n` cards of full charts, one chart with many rows, or `n` rows × 2 sparklines |
| `n`        | integer                          | charts on the page (list mode) or rows (table mode)                            |
| `points`   | integer                          | rows per chart                                                                 |
| `gate`     | `cv`                             | wraps each list card in `content-visibility: auto`                             |
| `nocharts` | `1`                              | table mode with an empty box per sparkline: the table's own floor              |

List charts render at 558×314 CSS pixels with both axes, grid lines, a tooltip, and two series.
The table is a `DataTable` with a name, two badges, two sparklines, and a date per row, like the
dashboard's app list. Sparklines are 112×24 with one series of the picked `kind`, `points` rows
each, and no axes; the bar Releases series is zero most of the time. Data comes from a seeded
generator.

## Commands

Run from `apps/www`. Every driver builds the site first; pass `--no-build` to reuse the last build.

```sh
pnpm bench -- --matrix=list --runs=3 --throttle=1,4 --out=list   # the full matrix driver; --animate=on,off picks the rows
pnpm bench -- --matrix=table --n=100 --runs=3 --out=table
pnpm bench:trace -- "?animate=0&kind=bar&mode=table&n=100&points=30" --runs=3 --per-task=14
pnpm bench:profile -- "?animate=0&kind=line&mode=list&n=100&points=30"
pnpm bench:report -- bench/results/list.jsonl --out=bench/results/report.md
node bench/summary.ts bench/results/list.jsonl
node bench/canvas-cost.ts 40
```

`run.ts` writes one JSON line per case to `bench/results/` (gitignored) and reports startup
(`mount ms` is the `lib-loaded` → `charts-painted` window; the main-thread, script, layout, and
style times come from CDP counters that run from navigation through a two-second settle, so
they cover the whole load; long tasks, Total Blocking Time, frame deltas, web vitals), a hover
sweep, clicks and keyboard stepping, two data updates, a scroll sweep, and memory. `trace.ts`
prints every main-thread task inside the mount window with a per-phase breakdown and a sampled
profile, which is the tool for "where does the time go" and for a main-thread figure scoped to
the mount. `canvas-cost.ts` measures raw canvas setup and paint with no React and no engine.

Timing runs are sensitive: do not run builds or tests while one is active.
