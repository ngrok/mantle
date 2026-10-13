# Chart Roots take a `mode`, and a sparkline is a static chart

**Date:** 2026-10-10
**Status:** Accepted
**Amends:** the `decorative` item of [2026-07-18-canvas-chart-family.md](./2026-07-18-canvas-chart-family.md) ("Interaction is Root's unconditional contract") and the sparkline stance of [2026-10-08-chart-list-mount-cost.md](./2026-10-08-chart-list-mount-cost.md) §2.

## Context

The dormant-mount work (#1547) put a `BarChart.Root` in every cell of a list page: two sparklines per row, forty in view. Each one was a full interactive chart: a `role="application"` Tab stop, a hover readout, a keyboard point cursor, and an sr-only data table on focus. The product's own list (the Ship apps page) shows no tooltip on its sparklines, and the question came up whether a sparkline in a table should be interactive at all.

The chart Roots had one switch, `decorative`, and it answered a different question: whether the values are information. A sparkline's values are information. Its bars tell a reader when activity happened and how it varied, and the number beside it tells how much. Hiding it from assistive technology, as `decorative` does, drops the first half.

## Decision

1. **A sparkline is informative but noninteractive.** It keeps an accessible name and a description. It has no Tab stop: one hundred sparklines in a table as one hundred Tab stops is a focus order no reader wants (WCAG 2.4.3). It has no hover readout: a value only a pointer can reach fails WCAG 1.4.13, and the exact values belong in the text beside the chart, where a reader compares them down the column. A chart that is the only source of its values stays interactive.
2. **`mode?: "interactive" | "static" | "decorative"` replaces the `decorative` boolean.** Two booleans could not name "noninteractive but not decorative". The names follow what the Root emits: `interactive` is a `role="application"` Tab stop with the keyboard contract, `static` is a named `role="img"`, `decorative` is `aria-hidden` and `inert`. `sparkline` was considered and rejected as a name: it names a size and a use, and a chart in a print report is the same mode.
3. **A static chart names the plot, not the Root.** `role="img"` makes its children presentational. The Root holds consumer parts (a legend, a copy button) that keep their own semantics, so the plot box (`data-slot="<kind>-plot"`), which holds only the canvas and the engine layers, carries `role="img"`, the name, and `aria-describedby` to the description. The description drops the keyboard sentence, because there is no overlay to answer it.
4. **A static chart defaults `animate` to `false`.** A list of sparklines that each play a reveal as the reader scrolls is motion with no information in it. An explicit `animate` still plays it.
5. **The contract is a type parameter, not a union over `mode`.** `ChartAccessibilityProps<TMode>` resolves the name and interaction props from `TMode` with a conditional type, and each family Root infers `TMode` from its `mode` prop. A three-member discriminated union was tried first: TypeScript relates a source to every union member whose discriminants match, and a Root with no `mode` matched both the interactive and the static member, so a `zKey={maybe}` prop on a scatter plot stopped type-checking. The generic form resolves one shape per call site and keeps every negative case (`static` with `activeIndex`, `decorative` with a name) a compile error.
6. **The bump is `minor`.** Mantle is `0.x`; the rename is breaking, and the guide at `/migrations/0009-chart-root-mode-migration` carries the steps.

## Consequences

- The [Sparklines in a List](../apps/www/app/docs/recipes/sparklines-in-a-list.mdx) recipe renders static sparklines, and the bench table (`/bench/charts?mode=table`) does the same, so the measured mount cost of a list no longer includes forty overlays, descriptions with keyboard sentences, and tooltip registrations.
- A static chart composes a `Tooltip` part without effect. The part stays allowed so a Root can switch modes without a tree change.
- A static or decorative chart inserts the canvas alone at activation: the three hover layers are dead DOM without an overlay, 600 nodes on a 100-row table. The engine takes `hover: null` and skips the overlay update. A mode change rebuilds the layers and paints again in the same effect.
- `ChartMode` is exported from every chart family for a consumer who threads the mode through a wrapper.

## Alternatives rejected

- **Keep `decorative` and add `interactive={false}`.** Two booleans allow four states, two of them meaningless (`decorative` with `interactive`), and neither name says what a reader gets.
- **A generated trend sentence in the static description** ("mostly steady", "an isolated spike"). The app knows the semantics of its data; mantle would invent prose about it. The description names what the chart holds (kind, count, range, series), and the app writes the trend where it writes the total.
- **Hover tooltips on static charts for pointer users only.** Rejected for the WCAG 1.4.13 reason above, and because the product's own list shows none.
