---
"@ngrok/mantle": patch
---

A press beside the thin `Slider` track now reaches it: the track takes presses 24px tall with a mouse and 44px tall with a finger, and its look and layout stay the same. A press on the track glides the thumb and the range to the new value in 200ms on `ease-out-strong`. A drag, a key press, and reduced motion still move the thumb at once. The root has `data-track-press` while the thumb glides.

See https://mantle.ngrok.com/components/forms/slider.
