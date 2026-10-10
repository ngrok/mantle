---
"@ngrok/mantle": patch
---

A chart resolves its theme tokens from the Root's computed style in one read. The computed value of a custom property arrives with every `var()` substituted, and the canvas parses the `oklch()` and `color-mix()` strings mantle's tokens resolve to, so one `getComputedStyle` read of the Root resolves every series and chrome color inside that Root's own cascade. A `--color-chart-N` override scoped to one Root still wins for that chart alone, as before. A bare `currentColor` resolves from the Root's computed `color`. A custom `ReferenceLine` color resolves through the same read. A hidden probe element now exists only as a fallback for a value the canvas cannot parse, such as `light-dark()` or a `currentColor` nested inside `color-mix()`, and it mounts inside the plot box (`data-slot="<kind>-plot"`), not in the Root's own child list, so a structural selector on the Root's children never counts it.

Before, every color read appended a probe `<span>` to the Root, read its computed `color`, and removed it, and each insertion forced a style recalculation of the whole chart subtree: 17 per chart, 1,704 for a list of 100 charts, 177 ms of style time at mount on an M3 Max. A chart now costs one style read per resolution pass. One theme observer per document invalidates the colors, and it ignores a same-value attribute rewrite.
