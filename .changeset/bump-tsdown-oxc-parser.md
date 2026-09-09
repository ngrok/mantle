---
"@ngrok/mantle": patch
"@ngrok/mantle-vite-plugins": patch
"@ngrok/mantle-server-syntax-highlighter": patch
---

Bump build and runtime dependencies: `tsdown` and `@tsdown/css` to 0.23.0, and `oxc-parser` to 0.149.0.

`tsdown` builds all three packages, so every published bundle and `.d.ts` file now comes from the new bundler. The public API does not change.

`oxc-parser` is a runtime dependency of `@ngrok/mantle-vite-plugins` and `@ngrok/mantle-server-syntax-highlighter`, so an install of either package resolves the new version.
