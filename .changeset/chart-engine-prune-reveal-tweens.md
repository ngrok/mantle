---
"@ngrok/mantle": patch
---

A chart no longer keeps an enter transition for every series `dataKey` it ever rendered. A long-lived chart whose series set churns, such as a top-N chart that swaps keys as traffic shifts, used to accumulate one transition per key for the life of the chart and tick each of them on every animated frame. When a series part unmounts, the chart now drops its enter transition. One behavior follows from this: a series part that unmounts and later mounts again plays its enter transition again, the same as a new series. A prop change on a mounted series still keeps its transition state.
