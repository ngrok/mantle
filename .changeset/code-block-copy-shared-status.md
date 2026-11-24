---
"@ngrok/mantle": patch
---

`CodeBlock.CopyButton` announces "Copied" in one shared `role="status"` region at the end of the page, or of the dialog around it, and no longer renders a region of its own. An answer with 29 code blocks held 29 regions; now it holds one. `ThemeSwitcher` uses the same region, and the region's `data-slot` is now `shared-status`, not `theme-switcher-status`.

`CodeBlock.CopyButton` renders its copy and check icons as one `<svg>`, and CSS swaps them on a new `data-copied` attribute. It does not render `IconSwap`. Mount of a 29-fence Markdown answer at 4× CPU slowdown drops about 6%.
