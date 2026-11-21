---
"@ngrok/mantle": patch
---

Ship the `invert-theme` island CSS only to pages that use it. `mantle.css` declares the island's palette aliases and its light palette restore as `@utility invert-theme`, so Tailwind emits them only when a scanned file names the class. Before, every page shipped them. An island resolves the same colors as before.

On a marketing page without an island, mantle's CSS drops from 127.9 KB to 113.9 KB minified (21.8 KB to 18.4 KB gzipped). With `mantleThemePrunePlugin`, it drops from 103.4 KB to 92.8 KB.

Write the class name in full in your source, such as `className="invert-theme"`. A name that only script builds, such as `"invert-" + theme`, gets no island palette. The island rules now sit in `@layer utilities`, so your own unlayered rule on the island element now wins over them.
