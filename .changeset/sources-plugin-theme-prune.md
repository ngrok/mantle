---
"@ngrok/mantle-vite-plugins": minor
---

`mantleSourcesPlugin()` now also runs `mantleThemePrunePlugin`, so each app that uses it ships less theme CSS with no change to `vite.config.ts`. The production stylesheet keeps the theme and `invert-theme` values of a palette stop only when the stylesheet reads that stop. Each stop that the stylesheet reads keeps all of its theme and island values. On ngrok.com, the stylesheet drops from 40.2 KB to 36.5 KB gzipped, and on the ngrok dashboard from 56.0 KB to 52.5 KB.

- If another file of the build reads a stop that the stylesheet does not, the build warns and names the stop.
- The build cannot see CSS outside the build, such as CSS another app or a CDN serves, or a stop name that code builds at runtime, such as `` `var(--color-${hue}-300)` ``. It does not warn about them. Name each such stop in a file the stylesheet scans, such as with `@source inline("bg-pink-300")`, or pass `themePrune: false` to keep every stop.
- If your config also adds `mantleThemePrunePlugin()`, you can remove it. The CSS stays the same.

**Migration:** `mantleSourcesPlugin()` now returns `Plugin[]`, not `Plugin`: the sources plugin, then the theme prune plugin. A `vite.config.ts` that puts the call in `plugins` needs no change, because Vite flattens nested arrays. Code that reads the return value changes:

- `mantleSourcesPlugin().name` becomes `mantleSourcesPlugin()[0].name`.
- A variable typed `Plugin` that holds the return value becomes `Plugin[]`, or spread it: `plugins: [...mantleSourcesPlugin()]`.
