---
"@ngrok/mantle": patch
---

A chart plays its motion only while it is on screen. A chart paints one viewport ahead of the scroll, and before, each chart in that band ran every update tween, every axis glide, and every tick-label fade in full: on a list, one half to two thirds of the charts that animated a data update were off screen. A chart that is near the viewport but off screen now paints an update settled, in one frame.

The value axis also stops its glide when the marks are within half a device pixel of their target. Before, it ran 40 frames at 60 Hz for a change of any size, and each frame painted the whole chart.

Two changes are visible. A chart that scrolls into view in the middle of an update shows the settled data. On a band or point scale, when the categories change and their count stays the same (a sliding window of time buckets), the marks snap to their new values, where before each bar slid into the value of its neighbor. The value axis still glides.
