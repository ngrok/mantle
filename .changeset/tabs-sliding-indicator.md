---
"@ngrok/mantle": patch
---

The active indicator of `Tabs` now slides and resizes from the tab that was active to the new one, in the classic and the pill appearance, horizontal or vertical. A mouse or a finger can drag it, as on `SegmentedControl`: press the active tab and move along the list. On release, the nearest enabled tab activates once, and a tab the drag passes over does not. A touch swipe on the active tab of a horizontal list that scrolls still scrolls the list. With reduced motion, the indicator moves at once. In forced colors, the indicator shows in the `Highlight` color.

`SegmentedControl` and `Tabs` share one hook for the slide and the drag. The checked `SegmentedControl` item now draws the thumb as its own `::before`, so the thumb no longer needs CSS anchor positioning. It slides and resizes in every browser, with no style or layout pass for each frame in Chromium.
