---
"@ngrok/mantle": patch
---

Add a `decorative` prop to every chart Root — `BarChart`, `LineChart`, `AreaChart`, and `ScatterPlot` — for placeholder and empty-state charts.

A decorative chart keeps its visual rendering and animation but drops every layer that only makes sense for real data: it is hidden from assistive technology, removed from the tab order, and inert to pointer and keyboard, with no hover band, tooltip, sr-only data table, or live region. This replaces the previous workaround of native `inert` plus CSS targeting chart internals (`[&_[role=application]]:pointer-events-none`), which leaked the chart's interaction structure into consumer code and required a misleading accessible name for fake data.

The accessible-name requirement and `decorative` are modeled as a discriminated union, so invalid combinations are unrepresentable: an interactive chart (the default) still requires exactly one of `aria-label` / `aria-labelledby` and may wire the interaction callbacks, while a decorative chart forbids the accessible-name props and the interaction props (`activeIndex`, `onActiveIndexChange`, `onDatumActivate`) — the chart won't compile with both. `decorative` communicates intent ("these values are not information") where a `disabled` flag would be ambiguous, since a chart is not a form control.

```tsx
<BarChart.Root data={placeholderUsage} xKey="day" decorative className="opacity-40">
	<BarChart.Bar dataKey="value" />
</BarChart.Root>
```
