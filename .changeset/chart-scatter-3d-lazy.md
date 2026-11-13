---
"@ngrok/mantle": patch
---

`ScatterPlot` loads its 3D code (the camera, the rotation drag, the projection, and the cube frame) as a separate chunk when a chart with a `zKey` mounts. A 2D scatter plot never downloads it and ships 47.5 KB instead of 48.3 KB (minified and gzipped). A 3D scatter plot paints its plot once the 2.6 KB chunk arrives, so it loads 50.0 KB in total.
