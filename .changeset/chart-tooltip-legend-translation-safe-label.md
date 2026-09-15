---
"@ngrok/mantle": patch
---

`AreaChart`, `BarChart`, `LineChart`, and `ScatterPlot` no longer crash their `Tooltip` and `Legend` render props on a page a browser translation engine has translated. Both host elements stay mounted for the life of the chart, so React removed a render prop's text nodes one at a time whenever the content went away: the pointer left the plot, the chart lost focus, `Escape` dismissed the readout, or keyboard stepping cleared the point cursor. Google Translate reparents each of those text nodes into a `<font>` first, and the `removeChild` threw `NotFoundError`, which tore down the React root and blanked the page. A readout that returned a fragment of bare text, such as `<>{hover.xValue}: {value}</>`, hit it on the first mouse-out.

A `children` readout now renders inside a `<div data-slot="area-chart-tooltip-label">`, and a `children` legend inside `<div data-slot="area-chart-legend-label">`. The other three charts spell them `bar-chart-`, `line-chart-`, and `scatter-plot-`. React removes that element instead of the text nodes, and an element removal cannot throw. Each div is `display: contents`, so it adds no box: your content stays a direct layout child of the tooltip or the legend, and a `className` you pass to either part keeps laying it out. The default readout and the default legend are unchanged and render no such div.

The eight slots are public API. The JSDoc and the docs-page API reference for each part list them.
