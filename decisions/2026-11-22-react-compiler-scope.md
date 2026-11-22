# The React Compiler keeps its scope: compile where a component holds a hook or creates a function

**Date:** 2026-11-22
**Status:** Accepted
**Builds on:** #1732 (`packages/mantle/scripts/mark-memo-free-components.ts`)

## Context

Mantle compiles its dist with the React Compiler. Since #1732, the build gives `"use no memo"` to each component that calls no hook and creates no function in render. On `main` at `d859fd15`, the compiler adds 69.6 KB gzip to the dist: 317.3 KB with it, 247.7 KB without it, summed over each dist file.

A performance sweep on 2026-11-22 proposed cutting that cost in three ways:

- turn the compiler off;
- tighten the build rule, so `useId`, `useRef`, `useContext`, `use`, host event handlers, and list callbacks no longer count as work;
- add `"use no memo"` to parts that seem to render once: the chart `Root` (`ChartRootPrimitive`), and the Root, Trigger, and Value of Select, Combobox, and MultiSelect, plus Switch.

Cody Price asked for a browser A/B of interactions that re-render before any of these changes, and for the change that gives the best result.

## How we measured

- **Harness.** A Vite 8 production app that imports a chosen dist build through an alias. Each page wraps the scenario in `<Profiler>` from `react-dom/profiling`. Chromium 159 runs headless through Playwright, with a 4× CPU throttle (CDP `Emulation.setCPUThrottlingRate`) and a fresh context for each case. One page runs at a time, and the variant order rotates each round.
- **Scenarios.**
  - **form:** typing 30 characters into a 24-field form that keeps its state in the parent, then three checkbox clicks.
  - **table:** a 100-row `DataTable` with five sort clicks, ten row selections, and two select-all clicks.
  - **select:** three Select open, arrow, and pick cycles, then typing and deleting in a Combobox, then the same in a MultiSelect with five tags.
  - **charts:** four `LineChart`s and two `BarChart`s, with eight data refreshes and a 41-step hover sweep.
  - **theme:** a `ThemeSwitcher` toggle eight times over a form and a table.
  - **dashboard:** the docs `AppShellDemo` with the table in its body, eight sidebar navigations, and one sort.
- **Metrics.**
  - **Commit time:** the Profiler `actualDuration` sum over the interactions.
  - **Event processing:** `processingEnd − processingStart` over Event Timing entries.
  - **Mean interaction duration** and the worst one (INP). Chromium rounds Event Timing durations to 8 ms.
  - **Heap:** CDP `Runtime.getHeapUsage` after a forced GC.
  - **JS:** the gzip `-9` sum of the JS files the page loads, React included.
- **Noise.** The orb's CPU speed changed between rounds by up to 2×. The later runs time a fixed loop before and after the interactions and divide each metric by it. Each figure below is the median over rounds of the variant-to-shipped ratio inside one round. The single-round ratios spread by ±10 to 20%, so a difference under about 5% is noise.
- **Runs.** The runs on `1e0f2d26` (before #1739) have 5 to 7 rounds and no calibration. The runs on `d859fd15` (after #1739) have 7 calibrated rounds. The scripts are not in the repo.

## Results

### Compiler off, against the shipped rule

| Scenario                         | Interaction cost with the compiler off           | Page JS (gzip)   | Heap  |
| -------------------------------- | ------------------------------------------------ | ---------------- | ----- |
| select (after #1739)             | processing +36%, mean duration +28%              | −10.0 KB (−9.2%) | −4.4% |
| charts (after #1739)             | commit +11%, processing +15%, mean duration +13% | −6.0 KB (−4.8%)  | −0.9% |
| charts (before #1739, 3 runs)    | commit +17% to +26%                              | −6.2 KB          | −1.0% |
| form (after #1739)               | processing +3% to +8%, within noise              | −7.7 KB (−7.2%)  | −4.7% |
| table (before #1739, 2 runs)     | commit +3% to +12%                               | −4.5 KB (−3.1%)  | −1.3% |
| dashboard (before #1739, 2 runs) | commit −2% to −16%                               | −12.9 KB (−5.8%) | −2.0% |
| theme (before #1739)             | no React commit; INP within noise                | −9.6 KB (−5.7%)  | −3.8% |

The compiler pays where parts re-render with inputs that stay equal: chart series and tooltips on a refresh or a hover, `DataTable` rows on a sort or a selection, and picker items on each keystroke. The picker study (Pickers after #1739) found the same: MultiSelect typing is 2× slower without it.

### Changes to the rule, against the shipped rule

| Variant                                                                                              | Faster                                   | Slower                                          | Page JS (gzip)  |
| ---------------------------------------------------------------------------------------------------- | ---------------------------------------- | ----------------------------------------------- | --------------- |
| Tight rule: stable hooks, host event handlers, and list callbacks do not count                       | form −7%, table −8%, select −9% (commit) | dashboard +14%, charts +10% (commit)            | −0.5 to −1.2 KB |
| Narrow rule: stable hooks and host event handlers do not count, plus the chart Root opt-out          | nothing past noise                       | table +13%, charts +19%, dashboard +7% (commit) | −0.2 to −2.8 KB |
| Picker parts opt out (Select Root, Value, Trigger; MultiSelect Root, Trigger; Combobox Root; Switch) | select processing −3%                    | form processing +10%, mean duration +9%         | −1.4 to −1.7 KB |
| Chart Root opts out                                                                                  | first mount −11%                         | commit +5%, processing +8%                      | −2.9 KB         |

- **The tight rule slows charts.** The likely cause is `ChartTooltipReadout`: its only function is a `.map` callback, so the tight rule uncompiles it, and the compiled output keeps the mapped rows between hover frames.
- **The picker opt-out slows form typing.** A form re-renders every field on each keystroke. The likely cause: a compiled `Select.Trigger` returns its cached caret icon chain, and an uncompiled one renders it again.
- **The chart Root opt-out slows each refresh.** The likely cause: the compiled Root keeps the child elements whose inputs stay equal.

A build that compiles every component (no `"use no memo"`) gave lower commit times in most scenarios before #1739, without calibration. It cost 1.4 to 5.6 KB gzip of JS per page and up to 1 MB more heap (+0.5% to +9%).

## Decision

1. **Keep the React Compiler on.** Off saves 6 to 13 KB gzip per page and up to 5% of heap. It makes picker, chart, and table interactions 3 to 36% slower.
2. **Keep the #1732 rule as it is.** Each change to it that we measured made one re-rendering interaction slower by more than the noise. Each one saved under 3 KB gzip per page.
3. **Add no `"use no memo"` to save bytes.** Write it only for a library that the compiler cannot model, as CONVENTIONS.md § React Compiler says. Do not add it to the chart Root or to the picker parts.

## Alternatives considered

- **Turn the compiler off.** Rejected: see the first results table.
- **Tighten the build rule.** Rejected: it trades a slower dashboard and slower chart hovers for under 1.2 KB per page.
- **Opt out per part (chart Root, picker Root, Trigger, Value, Switch).** Rejected: each part re-renders when its parent does, and the compiled cache then skips its static subtree.
- **Compile every component.** Not taken: it trades 1.4 to 5.6 KB per page and up to 9% of heap for faster commits that only uncalibrated runs measured. Measure it with calibration before you change the rule in that direction.

## Consequences

- The dist keeps the compiler's cost: 69.6 KB gzip across the dist, and 6 to 13 KB gzip on each measured page.
- A proposal to change the compile scope needs a browser A/B like this one: re-rendering interactions at 4× CPU, calibrated for host speed, with paired rounds. A byte count alone cannot decide it.
- Smaller picker and chart bytes must come from other work, such as a closed `Select.Content` that mounts nothing, or inline caret icons.
