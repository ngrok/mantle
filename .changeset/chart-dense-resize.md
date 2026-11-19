---
"@ngrok/mantle": patch
---

When only the height of a dense `LineChart` or `AreaChart` changes, the chart no longer reads each row again. A dense chart has 4 or more rows for each device-pixel column. When the count of device-pixel columns changes, such as for a new width, the chart still samples the rows again.
