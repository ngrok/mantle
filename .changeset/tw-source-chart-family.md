---
"@ngrok/mantle-vite-plugins": minor
---

`mantleTwSourcePlugin` supports the canvas chart family. The four new component names (`area-chart`, `bar-chart`, `line-chart`, `scatter-plot`) are recognized as valid `@ngrok/mantle/*` subpaths (previously they were filtered out of the generated `@source` block), and the generated block now also scans internal shared-engine chunks: chart components emit an extra `@source "chart-*.js"` glob for the shared canvas engine chunk, and `selectable-list` emits `@source "list-*.js"` for the list family's shared primitive chunk. Without these globs, Tailwind never scanned the code-split chunks that actually contain those components' classes, so consumers using the documented plugin setup got unstyled charts and lists. Pairs with the `@ngrok/mantle` build change that names shared chunks after their owning component directory. No consumer setup changes required.
