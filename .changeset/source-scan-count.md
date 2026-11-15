---
"@ngrok/mantle-vite-plugins": patch
---

The `mantleSourcesPlugin` build summary now counts only the files that `source-all.css` scans, the JavaScript files at the top of mantle's `dist`. Before, it also counted the type declarations, the JSON and text files, and the codemods.
