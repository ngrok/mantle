---
"@ngrok/mantle": patch
---

Draw a line or an area over bars. Compose `LineChart.Line` or `AreaChart.Area` inside a vertical `BarChart.Root`: the series runs through each category's center on the shared y axis, takes no bar slot, and joins no stack. The tooltip, the keyboard announcements, the data table, the copy button, and the legend list it. A stacked total counts the bars alone. `AreaChart.Area` also composes inside `LineChart.Root`, and `LineChart.Line` inside `AreaChart.Root`. A bar inside a line or area chart still throws, and the error now says why.
