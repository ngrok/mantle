---
"@ngrok/mantle-vite-plugins": patch
---

Add `mantleThemePrunePlugin`. It removes the mantle theme CSS that a production build does not read. It runs once on the finished bundle of `vite build` and changes only mantle's own theme rules:

- `mantle.css` restates every palette stop for the dark theme and for `invert-theme` islands. The plugin keeps a stop in those rules only when the same stylesheet reads it, including `@layer theme`, where Tailwind writes each stop that a scanned file names. The build warns when another file reads a stop that the stylesheet drops.
- Tailwind's color-mix fallbacks split each theme rule into pieces that repeat the theme selector. The plugin joins them.

On a marketing page, mantle's CSS drops from 128.6 KB to 104.1 KB minified (21.9 KB to 18.1 KB gzipped).

```ts
plugins: [tailwindcss(), mantleSourcesPlugin(), mantleThemePrunePlugin()],
```
