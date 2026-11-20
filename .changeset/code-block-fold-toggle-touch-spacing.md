---
"@ngrok/mantle": patch
---

Give the fold toggles of a `CodeBlock` enough space on a touch screen. On a coarse pointer, a code block that has fold toggles now uses a 24px line height instead of 20px, and each toggle is 24px high. The toggles of adjacent lines are then 24px apart, which the WCAG 2.5.8 target-size check needs. A fine pointer, and a code block with no fold toggles, show no change.
