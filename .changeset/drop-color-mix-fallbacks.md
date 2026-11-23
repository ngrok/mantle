---
"@ngrok/mantle": patch
---

`mantle.css` no longer emits Tailwind's `color-mix()` fallbacks. Tailwind wrote a fallback declaration and an `@supports (color: color-mix(in lab, red, red))` block for each translucent color, such as `bg-neutral-500/20`, the shadow tokens, and the focus ring tokens. They cost up to 1.9 KB gz (with every mantle class) and applied only below Tailwind 4's browser floor (Safari 16.4, Chrome 111, Firefox 128). In a browser without `color-mix()`, such as Safari 16.1 and earlier, translucent fills, shadows, and focus rings no longer show. Text stays readable.

An app that has its own `@import "tailwindcss"` before `mantle.css` keeps the fallbacks on its utilities and shadow tokens. Remove that import: `mantle.css` imports Tailwind. An app's own CSS, such as `@apply bg-neutral-500/20` in a stylesheet or a CSS module, keeps its fallbacks.
