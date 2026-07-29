---
"@ngrok/mantle-vite-plugins": patch
---

Map `sidebar` and `alert-center` to the internal chunks their Tailwind classes actually live in, so
`mantleTwSourcePlugin` scans them.

`INTERNAL_CHUNKS_BY_COMPONENT` tells the plugin which extra `dist/` files to hand Tailwind beyond the
per-component `@source "<name>-*.js"` globs. Two components were missing, and both failed the way §2.3 of the
component spec warns about — **completely unstyled, with lint, typecheck, test and build all green**:

- **`sidebar` → `button`, `separator`, `sheet`, `tooltip`.** `Sidebar` renders four other mantle components —
  an `IconButton` trigger, a `Separator`, the mobile `Sheet`, and the icon-rail `Tooltip` — and the build
  hoists each one's class strings into that component's own chunk. `dist/sidebar.js` keeps none of them, so a
  consumer importing only `@ngrok/mantle/sidebar` got an unstyled trigger, separator, mobile sheet and rail
  tooltip.
- **`alert-center` → `alert`.** `AlertCenter` renders the `Alert` banner chrome, expand button and dismiss
  button; those classes live only in `alert-<hash>.js`, so an alert-center-only consumer got unstyled banners.

Consumers who also import those subpaths directly are unaffected — the existing guard emits each chunk glob
exactly once.
