---
"@ngrok/mantle": patch
---

Tailwind no longer builds CSS from the class names in `cx`'s merge tables. Tailwind scans mantle's built JavaScript, and the tables listed about 180 classes by name, such as `invert-theme`, `backdrop-blur`, `snap-x`, and `mask-add`. So each page that imported a mantle component got those classes, used or not, and got the whole `invert-theme` island. The tables now separate names with commas, which Tailwind's scanner does not split on.

Measured with Tailwind 4.3.5 and the files that `mantleSourcesPlugin` lists, a marketing page drops from 109.6 KB to 81.1 KB minified (19.8 KB to 15.7 KB gzipped), and a product page from 160.9 KB to 134.4 KB (27.9 KB to 22.2 KB gzipped). With `mantleThemePrunePlugin`, the marketing page drops from 98.3 KB to 73.2 KB (17.7 KB to 13.4 KB gzipped).

A class that your app writes only in a runtime string, such as a class name from an API, may now build no CSS, because mantle's tables no longer add it by accident. Add it with `@source inline("…")` in your app's CSS.
