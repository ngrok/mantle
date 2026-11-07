---
"@ngrok/mantle": patch
---

`TruncatedText`: mount fast in large tables, and keep the ellipsis flush against the tail in any font.

- Each instance renders once on mount. One batch after the commit measures every instance that mounted: it reads all of them, then writes all of them, before the browser paints. In a production build with 152 rows, the mount commit drops from 23 ms to 3 ms.
- The tooltip mounts on the first hover or keyboard focus while the value overflows. A missing `TooltipProvider` now throws at that moment, not at mount. The root still carries `data-state="closed"` before the tooltip mounts.
- One `ResizeObserver` serves every instance. A resize writes `data-truncated` in the same frame, so the ellipsis no longer lags one frame behind the container.
- In a proportional font, the head now ends at the last glyph that fits with the ellipsis, so no gap shows between the ellipsis and the tail.

https://mantle.ngrok.com/components/data-display/truncated-text
