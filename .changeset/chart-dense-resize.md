---
"@ngrok/mantle": patch
---

A dense `LineChart` or `AreaChart` (4 or more rows for each device-pixel column) no longer reads each row again when only its height changes. A new width or a new device pixel ratio still samples the rows again.
