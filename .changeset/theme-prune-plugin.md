---
"@ngrok/mantle-vite-plugins": patch
---

Add `mantleThemePrunePlugin`. It removes the mantle theme CSS that a build does not use, and it changes no resolved color:

- `mantle.css` restates every palette stop for the dark theme and for `invert-theme` islands. The plugin keeps a stop in those rules only when Tailwind kept it in `@layer theme`.
- Tailwind's color-mix fallbacks split each theme rule into pieces that repeat the theme selector. The plugin joins them.

On a marketing page, mantle's CSS drops from 128.6 KB to 104.1 KB minified (21.9 KB to 18.1 KB gzipped).

```ts
plugins: [tailwindcss(), mantleSourcesPlugin(), mantleThemePrunePlugin()],
```
