# Chart mount benchmark

The drivers in this directory load `/bench/charts` (see `app/routes/bench.charts.tsx` and
`app/features/chart-bench/`) in headless Chromium through Playwright and read the main thread
through CDP. The page is linked from the Bar Chart docs page, under "Lists of charts".

## Scenarios

The page reads one scenario from its query string:

| param      | values                           | meaning                                                                        |
| ---------- | -------------------------------- | ------------------------------------------------------------------------------ |
| `lib`      | `mantle`, `mantle-static`        | `mantle-static` sets `animate={false}`                                         |
| `kind`     | `line`, `bar`, `area`, `scatter` | the chart family                                                               |
| `mode`     | `list`, `dense`, `table`         | `n` cards of full charts, one chart with many rows, or `n` rows × 2 sparklines |
| `n`        | integer                          | charts on the page (list mode) or rows (table mode)                            |
| `points`   | integer                          | rows per chart                                                                 |
| `gate`     | `cv`                             | wraps each list card in `content-visibility: auto`                             |
| `nocharts` | `1`                              | table mode with an empty box per sparkline: the table's own floor              |

List charts render at 558×314 CSS pixels with both axes, grid lines, a tooltip, and two series.
Sparklines are 112×24 with one bar series and no axes. Data comes from a seeded generator.

## Commands

Run from `apps/www`. Every driver builds the site first; pass `--no-build` to reuse the last build.

```sh
pnpm bench -- --matrix=list --runs=3 --throttle=1,4 --out=list   # the full matrix driver
pnpm bench -- --matrix=table --n=100 --runs=3 --out=table
pnpm bench:trace -- "?lib=mantle-static&kind=bar&mode=table&n=100&points=12" --runs=3 --per-task=14
pnpm bench:profile -- "?lib=mantle-static&kind=line&mode=list&n=100&points=30"
pnpm bench:report -- bench/results/list.jsonl --out=bench/results/report.md
pnpm exec tsx bench/summary.ts bench/results/list.jsonl
pnpm exec tsx bench/canvas-cost.ts 40
```

`run.ts` writes one JSON line per case to `bench/results/` (gitignored) and reports startup
(the `lib-loaded` → `charts-painted` window, main-thread task time, long tasks, Total Blocking
Time, frame deltas, web vitals), a hover sweep, clicks and keyboard stepping, two data updates,
a scroll sweep, and memory. `trace.ts` prints every main-thread task inside the mount window
with a per-phase breakdown and a sampled profile, which is the tool for "where does the time
go". `canvas-cost.ts` measures raw canvas setup and paint with no React and no engine.

Timing runs are sensitive: do not run builds or tests while one is active.
