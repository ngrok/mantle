---
"@ngrok/mantle": patch
---

Charts now paint and free their canvases at the distances their docs give. A chart paints once it comes within one viewport of the visible area. It frees its canvas three viewports away. The visibility observers set both `rootMargin` and `scrollMargin`, and browsers apply both margins to the document's own scroller. Firefox adds the two. Chromium and WebKit resolve the `scrollMargin` percentage against the viewport that `rootMargin` already widened, so the paint band reached four viewports past each edge of the visible area, and the release band reached 24. On a long page, nearly every chart painted at mount, and no chart freed its canvas. The observers now set `scrollMargin` alone, which widens the viewport and every scrolling panel by the same margin. A browser without `scrollMargin` support keeps `rootMargin` and the scroll-panel fallback.

Measured in Chromium 156 on Linux, on a list of 100 bar charts (median of 5 runs): 36 charts paint at mount instead of 96, the first full paint lands 47–60 ms sooner, and 76 canvases stay live after a scroll to the bottom and back instead of 100. The scroll now pays for the charts that paint later: 148–159 ms of main-thread time instead of 52–70 ms.
