---
"@ngrok/mantle": patch
---

`TruncatedText`: mount fast in large tables, and keep the ellipsis flush against the tail in any font.

- Each instance renders once on mount. One batch after the commit measures every instance that mounted: it reads all of them, then writes all of them, before the browser paints. In a production build with 152 rows, the mount commit drops from 23 ms to 3 ms.
- The tooltip mounts on the first hover or keyboard focus while the value overflows. A missing `TooltipProvider` now throws at that moment, not at mount. The root still carries `data-state="closed"` before the tooltip mounts.
- One `ResizeObserver` serves every instance. A resize writes `data-truncated` in the same frame, so the ellipsis no longer lags one frame behind the container.
- In a proportional font, the head now ends at the last glyph that fits with the ellipsis, so no gap shows between the ellipsis and the tail.
- In Safari, `head` now keeps its whole lead, such as `mem_…A8KImPbQ` and not `mem…A8KImPbQ`, and the root no longer reserves an empty cell after the tail. The measurement reads the visually hidden copy of the value, because WebKit clips a text range at a `text-overflow` ellipsis.
- In Safari, a tooltip whose value wraps now gets lines of near-equal length. WebKit does not balance text that breaks between letters, so the last line held a few characters.
- A page change in a large table commits faster. The measurement reads every width through one text range, so a text write no longer visits thousands of ranges. In a production build with 500 rows, a page change drops from 73 ms to 51 ms in a proportional font, and from 54 ms to 32 ms in a monospace font.
- The measured widths go on the head and the tail, not on the root, so a write restyles only those two segments. With 500 rows, a mount drops from 69 ms to 60 ms, and a resize frame in a proportional font drops from 28 ms to 23 ms.
- In Firefox, a value in a container narrower than its tail no longer writes its styles in every frame while the page is idle. Firefox reads a text width up to 1e-5 px apart after the text moves, and the measurement now rounds each width to 1/64 px.
- Inside a `Dialog`, a `Popover`, or other content that opens with a zoom, `data-truncated`, the tab stop, and the ellipsis no longer depend on the scale at the time of the measurement.
- A clipped value no longer keeps its tab stop when an element above it becomes a link or another control after mount.
- A value that React renders into a same-origin frame now gets its measured fit and lead.

https://mantle.ngrok.com/components/data-display/truncated-text
