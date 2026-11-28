---
"@ngrok/mantle": patch
---

Add `AxisTitle` to line, bar, area, and scatter charts. Compose it inside an axis to name that axis: `<LineChart.XAxis><LineChart.AxisTitle>Time of request</LineChart.AxisTitle></LineChart.XAxis>`. The title is HTML text, so screen readers and search engines read it. The x title sits under the plot, and it also heads the x column of the screen-reader data table in place of the `xKey`. A y title reads bottom to top on the left, and top to bottom beside a right axis. On horizontal bars, each title moves with its axis.

The title stays on one line and truncates with an ellipsis; set `className="whitespace-normal"` to let it wrap. The chart places each title in its own grid cell, so the order of the parts does not move it, and CSS sets its position before the chart paints. A chart with no title keeps its layout. A 3D scatter plot labels its own frame and shows no title. `XAxis` and `YAxis` now take an `AxisTitle` element as `children`. A consumer `hidden` class on the Root still hides a titled chart.
