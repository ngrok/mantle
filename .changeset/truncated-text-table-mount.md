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

https://mantle.ngrok.com/components/data-display/truncated-text
