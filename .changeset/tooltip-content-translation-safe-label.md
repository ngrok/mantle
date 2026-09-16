---
"@ngrok/mantle": patch
---

`Tooltip.Content` now renders `children` inside a `<div data-slot="tooltip-label">`. The arrow is a permanent element sibling, so a bare text body was never a lone child of the surface: React held a real text node for it, and on a page a browser translation engine had translated, the removal React runs when the body changes shape or goes away raised `NotFoundError` and blanked the page. The wrapper stays mounted, so a lone string body takes React's `textContent` path, which wipes the translation wrapper instead of removing a node the surface no longer owns.

The wrapper is a `<div>` because a tooltip body is often a `<p>`, which a `<span>` may not contain. It is `display: contents`, so it adds no box and every child of your body stays a layout child of the surface.

`tooltip-label` is public API, and the docs page lists it beside `tooltip-content`. `TooltipProvider` no longer stamps `data-slot="tooltip-provider"`: the Radix provider renders no DOM, so that attribute named an element that never existed.
