---
"@ngrok/mantle": patch
---

A chart re-render with unchanged `Tooltip` props no longer re-registers the tooltip. Before this change, every render of a parent that composed `BarChart.Tooltip`, `LineChart.Tooltip`, `AreaChart.Tooltip`, or `ScatterPlot.Tooltip` tore down and re-created the registration. Each registration republished to the legend, the tooltip, the live region, and the sr-only data table. It also repainted the canvas with nothing changed. A dashboard that re-renders once a second for an unrelated reason paid a full repaint per chart per second. The part now re-registers only when one of its props changes by identity. An inline function or object still counts as a change on every render: a `labelFormat`, `valueFormat`, `footer`, or `children` function, a `footer` element, or an `onClick` handler or `style` object among the div props. Pass stable values to skip the republish.
