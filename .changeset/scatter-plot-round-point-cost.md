---
"@ngrok/mantle": patch
---

`ScatterPlot` draws a round point with about half the canvas work. Each circle recorded a `moveTo` before its `arc`, and Chromium then records the circle as a general path. A round point is now one bare `arc`. In headless Chromium 158 on an Apple M3 Max, one paint of 5,000 points with rings takes 2.5 ms in place of 4.7 ms, and one paint of 10,000 points takes 2.3 ms in place of 6.2 ms (a 960 by 400 canvas at a device pixel ratio of 2, median of 4 interleaved rounds). A 3D plot, which paints each frame of a rotation, gets the same gain. In Chromium, the edge pixels of a round point change: it has the antialiasing of a circle again, as before 0.94.0. The other point shapes paint the same pixels.
