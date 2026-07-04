---
"@ngrok/mantle": patch
"@ngrok/mantle-vite-plugins": patch
"@ngrok/mantle-server-syntax-highlighter": patch
---

fix: publish a lean package.json — prune custom export conditions and slim the manifest

The `@ngrok/src-live-types` custom export condition only exists so workspace apps can resolve live source files during local development, but it was shipping in the published `package.json#exports` and pointing npm consumers at `./src/...` paths that are excluded from the tarball. A new `prepack`/`postpack` lifecycle pair now rewrites the manifest while the tarball is created and restores the pristine `package.json` afterwards:

- strips all custom (`@`-namespaced) export conditions
- collapses `{ types, import }` export entries to plain string targets (TypeScript resolves the sibling `.d.ts` automatically)
- drops `import` conditions that duplicate `default` (the CSS entries)
- removes `devDependencies` and `scripts`, which consumers never install or run

Published packages now expose only standard conditions pointing at `dist`, and each release permanently adds roughly half as much metadata to the npm packument.
