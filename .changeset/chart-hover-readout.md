---
"@ngrok/mantle": patch
---

A chart places its hover readout right in the first frame, and the hover layers cost the page less:

- The tooltip no longer paints one frame at a stale position each time the pointer enters a chart. Before, the first frame used the size of the empty tooltip (or no size on the first hover), so on an 80 px chart the readout showed up to 66 px too low and then jumped.
- The crosshair, the hover band, the marker dots, and the tooltip move with a 2D `translate`. With `translate3d`, each chart that a reader pointed at kept up to four compositor layers. A test that parses the `transform` of a hover layer must read `translate(…)`.
- A `Tooltip` part that registers again (an inline `valueFormat` in an app without the React Compiler does so on each parent render) no longer repaints the marks.
