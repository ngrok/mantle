---
"@ngrok/mantle": patch
---

`CodeBlock.CopyButton` announces "Copied" in one shared `role="status"` region at the end of the page, or of the dialog around it, and no longer renders a region of its own. An answer with 29 code blocks held 29 regions; now it holds one. `ThemeSwitcher` and the `CopyButton` of `BarChart`, `LineChart`, `AreaChart`, and `ScatterPlot` use the same region. The chart copy buttons no longer render a `live-region` beside them. The region's `data-slot` is now `shared-status`, not `theme-switcher-status`. The region has `aria-atomic="true"`, like `LiveRegion`, and clears 7 seconds after each message, so a screen reader does not find an old "Copied" at the end of the page.

A `CodeBlock.CopyButton` whose `onClick` cancels a click within 2 seconds of a copy now shows the copy icon again. Before, the check icon stayed.

`CodeBlock.CopyButton` renders its copy and check icons as one `<svg>`, and CSS swaps them on a new `data-copied` attribute. It does not render `IconSwap`. Mount of a 29-fence Markdown answer at 4× CPU slowdown drops about 6%.
