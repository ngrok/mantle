---
"@ngrok/mantle": patch
---

**Smoother enter/exit motion for `Tooltip`, `Popover`, and `HoverCard`.** Their content surfaces now share a single `overlay-animation` recipe that layers opacity, scale, a short directional translate toward the trigger, and a brief blur that resolves to sharp — so the surface materializes instead of snapping in.

- The scale now emanates from the trigger via Radix's `--radix-*-content-transform-origin`.
- `prefers-reduced-motion: reduce` drops the animation entirely (instant mount/unmount).

No API changes. Consumers passing a custom `className` continue to override as before.
