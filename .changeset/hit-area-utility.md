---
"@ngrok/mantle": patch
---

Add the `hit-area` utility. It gives a small control a tap target of at least 44px by 44px with no change to its look or the layout. The hit area is an invisible `::after` pseudo-element, centered on the control. Set `--hit-area-size` for another minimum.

The thumb of a `Slider` now uses `hit-area`. Its tap target is 44px wide instead of 34px.
