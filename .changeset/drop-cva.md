---
"@ngrok/mantle": patch
---

`@ngrok/mantle` no longer depends on `class-variance-authority`. `Button`, `IconButton`, `ButtonGroup`, `Tabs`, `Alert`, and `Flag` pick their classes from plain variant maps. Their props and the classes they render do not change. A page with a `Button` or `Tabs` loads about 0.3 to 0.5 KB less JavaScript (gzip). `VariantProps` from `@ngrok/mantle/types` keeps its result, and it now also accepts a function whose props argument is required.
