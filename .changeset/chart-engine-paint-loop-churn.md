---
"@ngrok/mantle": patch
---

Cut per-frame work in the chart paint loop. A stacked chart above 2,500 rows, or one dense enough to decimate, re-sorted its series list twice per series on every animated frame and again on every hover sync to find each series' stack boundary; the paint loop now reads the boundary by the series' paint index. The hover overlay and the hover snapshot now read a cached series list instead of re-sorting the series on every sync. The chart now creates the reduced-motion media query once instead of once per animated frame. It still reads the live preference, so a mid-session toggle snaps the next frame as before. Nothing visible changes.
