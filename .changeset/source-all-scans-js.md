---
"@ngrok/mantle": patch
---

`@ngrok/mantle/source-all.css` now scans only the JavaScript in `dist`. Before, Tailwind also scanned the type declarations, `agent.json`, `llms.txt`, and the codemods, and emitted CSS for the class names in their JSDoc examples, which no component renders. The CSS output is about 5 KB smaller (minified), and the scan is faster.

`@ngrok/mantle/highlight-utils` no longer loads the Tailwind class merge engine, so its bundle is about 29 KB smaller (raw).
