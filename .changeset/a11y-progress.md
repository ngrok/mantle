---
"@ngrok/mantle": patch
---

Document the accessible name contract for `ProgressBar` and `ProgressDonut`. Both render `role="progressbar"`, so they need a name: pass `aria-label`, or `aria-labelledby` that points at a visible label. Every docs and JSDoc example now does. The JSDoc and docs also state that a `value` outside `0..max` renders as indeterminate, list the emitted data attributes, drop a stale `viewBox` rationale from `strokeWidth`, and correct the `ProgressDonut.Indicator` examples to set the color with `className`, not the SVG `color` attribute.
