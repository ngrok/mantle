---
"@ngrok/mantle": minor
---

**Breaking: the chart Roots take `mode` in place of the `decorative` boolean.** `LineChart.Root`, `BarChart.Root`, `AreaChart.Root`, and `ScatterPlot.Root` take `mode?: "interactive" | "static" | "decorative"`. `"interactive"` is the default and is the chart as it always was. `"decorative"` is the old `decorative` behavior under a new name, with one change: its plot now holds the canvas alone, with no hover layers (`data-slot="<kind>-crosshair"`, `"-hover-band"`, `"-markers"`), because nothing can hover it. `"static"` is new. Replace `decorative` with `mode="decorative"`; nothing else about a decorative chart changes. The migration guide is at https://mantle.ngrok.com/migrations/0009-chart-root-mode-migration.

`mode="static"` is a chart a reader glances at while the exact values sit beside it as text: a sparkline in a table row or a card, a trend in a print report. The plot is a named `role="img"`, with the same `aria-label` or `aria-labelledby` an interactive chart takes and an `aria-describedby` to the description (the chart kind, the count, the x range, and the series labels, without the keyboard instructions), so a screen reader hears what the chart holds without a Tab stop. There is no interaction overlay: no hover band, no tooltip, no keyboard point cursor, no data table, no live region, and no `data-state`. At activation its plot holds the canvas alone; the crosshair, hover band, and marker layers never mount. A composed `Tooltip` part registers nothing. Pointer events pass through to the row or card behind it. The series keep their colors. `animate` defaults to `false` in static mode, because a list of sparklines that each play a reveal as the reader scrolls is motion with no information in it; pass `animate` to play it. The interaction props (`activeIndex`, `onActiveIndexChange`, `onDatumActivate`) do not compile on a static chart, and a name is required, as on an interactive one.

Why: noninteractive is not decorative. A sparkline beside a total still tells a reader when activity happened and how it varied, so it keeps a name and a description, and only its values live in the text beside it. One hundred sparklines in a table as one hundred Tab stops is a focus order no reader wants, and a readout only a pointer can reach fails WCAG 1.4.13, so a static chart offers neither. A chart that is the only source of its values stays interactive.

The `mode` prop's JSDoc carries a table of the three modes with the use case and the reader's experience of each, and a full-tree example per mode. `ChartMode` is exported from every chart family. The [Sparklines in a List](https://mantle.ngrok.com/recipes/sparklines-in-a-list) recipe now renders static sparklines.

Migrate a test suite that reaches a sparkline:

- A static chart is `getByRole("img", { name })`, not `getByRole("application", …)`, and `user.tab()` skips it.
- A static chart mounts no data table and no tooltip surface, so a test that waited for either on a sparkline asserts the description instead: `expect(image).toHaveAccessibleDescription(/^Bar chart with 30 categories/)`.

Docs: https://mantle.ngrok.com/components/charts/line-chart#modes, https://mantle.ngrok.com/components/charts/bar-chart#modes, https://mantle.ngrok.com/components/charts/area-chart#modes, https://mantle.ngrok.com/components/charts/scatter-plot#modes
