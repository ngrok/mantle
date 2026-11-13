---
"@ngrok/mantle": patch
---

`IconSwap` hides an inactive icon with `visibility: hidden` when its exit transition ends. Before, the hidden loading spinner of each `IconButton`, and of each `Button` with an `icon`, held a paused animation, and Chromium kept one compositor layer for the spinner and one for the icon beside it. A page of 100 cards with one `IconButton` each held 130 such layers, and each layer made every compositing update of the page slower.

Measured with the docs site's chart bench on that page (Chromium 158 on Linux with a software GPU, median of 3 interleaved runs): the page holds 5 compositor layers at load in place of 135, and the main-thread time of one pointer move over a chart fell from 9.7 ms to 4.4 ms. The swap looks the same, and under reduced motion it is still instant.
