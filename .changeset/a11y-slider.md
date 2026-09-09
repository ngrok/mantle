---
"@ngrok/mantle": patch
---

`Slider` documentation matches the code. The `color` default is `"bg-accent-600"`, not `"bg-accent-500"`; `minStepsBetweenThumbs` defaults to `1`, not `0`; `showTicks` spreads one tick per `step` evenly across the track, so the ticks do not land on the step values when the range is not a multiple of `step`; and `aria-labelledby` names every thumb with the same text, so a range slider should prefer `aria-label`, which derives a name per thumb.
