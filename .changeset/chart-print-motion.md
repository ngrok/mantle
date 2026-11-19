---
"@ngrok/mantle": patch
---

A chart that is not on screen no longer animates a data update while the page prints. Between `beforeprint` and `afterprint`, each chart on the page played the full update animation for each data update (32 to 37 frames), also a chart far from the viewport, and such a chart kept the rest of the animation for the moment it came into view. A chart that is not on screen now paints the new data at once. A chart on screen keeps its motion.
