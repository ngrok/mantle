---
"@ngrok/mantle": patch
---

Ship the `invert-theme` island CSS only to pages that use it. `mantle.css` now declares the island's palette aliases and its light palette restore as `@utility invert-theme`, so Tailwind emits them only when a scanned file names the class. Before, every build shipped them.

With `mantleSourcesPlugin`, a marketing page without an island drops from 127.9 KB to 113.9 KB minified (21.8 KB to 18.4 KB gzipped), and from 103.4 KB to 92.8 KB with `mantleThemePrunePlugin`. With `source-all.css` and no plugin, the build scans `Sandbar`, so it still ships the island CSS.

What changes for an island:

- Write the bare class in full in a scanned file, such as `className="invert-theme"`. A name that only script builds, such as `"invert-" + theme`, gets no island palette. To keep one, add `@source inline("invert-theme");` to your stylesheet.
- Use the bare class only. Tailwind accepts `md:invert-theme`, `hover:invert-theme`, and `invert-theme!`, but they flip only the palette, not the semantic tokens.
- The island rules now sit in `@layer utilities`. Your own unlayered rule on the island element, and a utility that sets the same custom property, can now override them.

Every `invert-theme` use in ngrok's apps is a literal class in a scanned file.
