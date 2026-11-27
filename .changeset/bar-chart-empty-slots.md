---
"@ngrok/mantle": patch
---

Add `BarChart.EmptySlot`. Compose it with a `label` to paint an outlined empty bar at each row where no series has a value (`null` or a missing key), in stacked, grouped, and horizontal bars. The tooltip, the keyboard announcement, and the data table say the label there. A `0` stays a reading: it paints no outline and reads `0`. The outline does not change the value axis. Without the part, a row with no value is a gap, as before. The tooltip's `HoverSnapshot` gets an `emptySlotLabel` field for that row, so a custom `children` readout can render it.
