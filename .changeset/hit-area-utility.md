---
"@ngrok/mantle": patch
---

Add the `hit-area` utility, an escape hatch for a control that must stay small. It gives the control a tap target of at least 44px by 44px with no change to its look or the layout. The hit area is an invisible `::after` pseudo-element, centered on the control. Set `--hit-area-size` for another minimum.

Do not use it by default: first make the control the correct size. The [Hit Area](https://mantle.ngrok.com/base/hit-area) page lists when to use it, when not to, and the risks.

The thumb of a `Slider` now uses `hit-area`. Its tap target is 44px wide instead of 34px. With more than one thumb, the tap target grows only across the track, so it does not cover an adjacent thumb.
