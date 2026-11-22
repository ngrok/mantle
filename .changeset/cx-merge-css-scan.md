---
"@ngrok/mantle": patch
"@ngrok/mantle-vite-plugins": patch
---

Tailwind no longer scans the `cx` class-merge tables, so every page ships less CSS. The tables list every Tailwind keyword (`table-footer-group`, `snap-mandatory`, `container`, and others), and a scan made CSS rules for them that no component renders.

The merge code now ships in its own `cx-merge-<hash>.js` chunk. `source-all.css` skips that chunk with `@source not`, and `mantleSourcesPlugin` does not list it. You do not need to change your setup.

Measured with Tailwind 4.3.5, minified, `gzip -9`:

- `mantle.css` with `source-all.css`: 244.1 KB to 231.3 KB minified, 37.5 KB to 35.8 KB gzip.
- A login page with `mantleSourcesPlugin`: 101.9 KB to 84.8 KB minified, 16.4 KB to 14.1 KB gzip.
- A marketing page with `mantleSourcesPlugin`: 100.8 KB to 83.4 KB minified, 16.2 KB to 13.8 KB gzip.

If you list mantle files with your own `@source` globs, do not list `cx-merge-*.js`.
