---
"@ngrok/mantle": patch
---

Tailwind no longer builds CSS from the class names in `cx`'s merge tables. Tailwind scans mantle's built JavaScript, and the tables listed about 180 classes by name, such as `invert-theme`, `backdrop-blur`, `snap-x`, and `mask-add`. So each page that imported a mantle component got those classes, used or not, and got the whole `invert-theme` island. The tables now separate names with commas, which Tailwind's scanner does not split on.

Measured with Tailwind 4.3.5 and the files that `mantleSourcesPlugin` lists, a marketing page drops from 107.7 KiB to 80.2 KiB minified (19.6 KiB to 15.6 KiB gzipped), and a product page from 158.9 KiB to 132.7 KiB (27.6 KiB to 22.0 KiB gzipped). With `mantleThemePrunePlugin`, the marketing page drops from 97.8 KiB to 73.3 KiB (17.7 KiB to 13.6 KiB gzipped).

A class that your app writes only in a runtime string, such as a class name from an API, may now build no CSS, because mantle's tables no longer add it by accident. Add it with `@source inline("…")` in your app's CSS.
