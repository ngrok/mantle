---
"@ngrok/mantle-vite-plugins": patch
---

Bump the `magic-string` runtime dependency from 0.30.21 to 1.0.0 and move the optional `vite` peer range floor from `^8.1.4` to `^8.1.5`.

The magic-string 1.0.0 major is packaging-only: the package is now pure ESM (CJS/UMD/IIFE builds dropped, type declarations generated from TypeScript source) and the maintainers bumped the major solely to signal that change — the runtime API is unchanged. `@ngrok/mantle-vite-plugins` is itself ESM-only and imports magic-string as an external dependency, so plugin behavior and sourcemap output are identical. Vite 8.1.5 is a bug-fix-only patch; nothing in the plugins requires it — the floor tracks the workspace version, and consumers still on vite 8.1.4 will see an unmet-peer warning until they upgrade.
