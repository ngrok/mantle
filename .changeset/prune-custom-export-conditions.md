---
"@ngrok/mantle": patch
"@ngrok/mantle-vite-plugins": patch
"@ngrok/mantle-server-syntax-highlighter": patch
---

fix: prune custom export conditions from published packages

The `@ngrok/src-live-types` custom export condition only exists so workspace apps can resolve live source files during local development, but it was shipping in the published `package.json#exports` and pointing npm consumers at `./src/...` paths that are excluded from the tarball. A new `prepack`/`postpack` lifecycle pair now strips all custom (`@`-namespaced) conditions from `exports` while the tarball is created and restores the pristine `package.json` afterwards, so published packages only expose the standard `types`/`import`/`style`/`default` conditions pointing at `dist`.
