---
"@ngrok/mantle": patch
---

`SliderValue` shows a `Slider`'s value in a small label while a pointer or a finger drags a thumb, and hides it at rest and under keyboard focus. Place it inside `Slider`. It sits above each thumb and follows it, or with `placement="track"`, above the center of the track. CSS places it, and a label at a thumb stays inside the slider at each end. The new `formatValue` prop sets its text and `aria-valuetext` on each thumb. The root has `data-dragging` during a drag. A slider without `SliderValue` renders as before.

See https://mantle.ngrok.com/components/forms/slider.
