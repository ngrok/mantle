---
"@ngrok/mantle": minor
---

Add a right y axis to line, bar, area, and scatter charts. Compose a second `YAxis` with `side="right"` and set `yAxis="right"` on each series that reads it: `LineChart.Line`, `BarChart.Bar`, `AreaChart.Area`, `ScatterPlot.Point`, or a `LineChart.Line` drawn over bars. `ReferenceLine` takes `yAxis="right"` too. Each axis has its own scale. The right axis puts a round value on each left grid line when it can, so one set of grid lines reads on both sides. The legend lists the left axis's keys first and the right axis's keys at its far end. Labels show as you write them; put the side in a label when your readers need it.

A right-axis series throws without a `YAxis side="right"`, without a series on the left axis, in a 3D scatter plot, or when it would join a stacked chart's pile. Horizontal bars take no right axis.

Breaking: the chart Roots no longer take `yDomain`. Set `domain` on the `YAxis` part instead: `<LineChart.Root yDomain={[0, 100]}>` becomes `<LineChart.YAxis domain={[0, 100]} />`. Each axis sets its own range this way. `BarChart.YAxis` and `AreaChart.YAxis` keep the zero minimum (`[0, number | "auto"]`). A chart with no `YAxis` can no longer fix its range. To migrate, run the codemod: `npx --yes --package=@ast-grep/cli@0.51.3 ast-grep scan --rule node_modules/@ngrok/mantle/dist/migrations/chart-y-axis-domain.yml --update-all <path>`. Migration guide: https://mantle.ngrok.com/migrations/chart-y-axis-domain-migration
