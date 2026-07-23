# @ngrok/mantle-vite-plugins

## 1.1.1

### Patch Changes

- [#1345](https://github.com/ngrok/mantle/pull/1345) [`685e5f5`](https://github.com/ngrok/mantle/commit/685e5f50770f68669bf4a39b0d883bc9e7e603fe) Thanks [@dependabot](https://github.com/apps/dependabot)! - Bump runtime dependencies: `magic-string` to 1.1.0 and `oxc-parser` to 0.141.0.

- Updated dependencies [[`685e5f5`](https://github.com/ngrok/mantle/commit/685e5f50770f68669bf4a39b0d883bc9e7e603fe)]:
  - @ngrok/mantle-server-syntax-highlighter@1.1.8

## 1.1.0

### Minor Changes

- [#1340](https://github.com/ngrok/mantle/pull/1340) [`f5b991e`](https://github.com/ngrok/mantle/commit/f5b991e97aeba9489c72c4487d657a1aefec625c) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - `mantleTwSourcePlugin` supports the canvas chart family. The four new component names (`area-chart`, `bar-chart`, `line-chart`, `scatter-plot`) are recognized as valid `@ngrok/mantle/*` subpaths (previously they were filtered out of the generated `@source` block), and the generated block now also scans internal shared-engine chunks: chart components emit an extra `@source "chart-*.js"` glob for the shared canvas engine chunk, and `selectable-list` emits `@source "list-*.js"` for the list family's shared primitive chunk. Without these globs, Tailwind never scanned the code-split chunks that actually contain those components' classes, so consumers using the documented plugin setup got unstyled charts and lists. Pairs with the `@ngrok/mantle` build change that names shared chunks after their owning component directory. No consumer setup changes required.

### Patch Changes

- Updated dependencies []:
  - @ngrok/mantle-server-syntax-highlighter@1.1.7

## 1.0.18

### Patch Changes

- [#1328](https://github.com/ngrok/mantle/pull/1328) [`f5c6bfd`](https://github.com/ngrok/mantle/commit/f5c6bfd07b9ab742d0251de86866dd62135da48a) Thanks [@dependabot](https://github.com/apps/dependabot)! - Bump the `magic-string` runtime dependency from 0.30.21 to 1.0.0 and move the optional `vite` peer range floor from `^8.1.4` to `^8.1.5`.

  The magic-string 1.0.0 major is packaging-only: the package is now pure ESM (CJS/UMD/IIFE builds dropped, type declarations generated from TypeScript source) and the maintainers bumped the major solely to signal that change — the runtime API is unchanged. `@ngrok/mantle-vite-plugins` is itself ESM-only and imports magic-string as an external dependency, so plugin behavior and sourcemap output are identical. Vite 8.1.5 is a bug-fix-only patch; nothing in the plugins requires it — the floor tracks the workspace version, and consumers still on vite 8.1.4 will see an unmet-peer warning until they upgrade.

- Updated dependencies []:
  - @ngrok/mantle-server-syntax-highlighter@1.1.7

## 1.0.17

### Patch Changes

- [#1288](https://github.com/ngrok/mantle/pull/1288) [`9d988f2`](https://github.com/ngrok/mantle/commit/9d988f203ddd4a7a433871478adfa1fd4e21af34) Thanks [@dependabot](https://github.com/apps/dependabot)! - Raise the optional `vite` peer range floor from ^8.0.16 to ^8.1.4 to match the workspace's Vite version.

- [#1313](https://github.com/ngrok/mantle/pull/1313) [`2f5ddc9`](https://github.com/ngrok/mantle/commit/2f5ddc9d44e5a48abaed6414f7dfb954e3b9fb18) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Add `breadcrumb`, `centered-layout`, and `theme-switcher` to `MANTLE_COMPONENT_NAMES` so `mantleTwSourcePlugin` recognizes imports of the new `@ngrok/mantle` subpaths and emits their `@source` directives — without this, apps importing the new components would silently get no Tailwind classes for them.

- Updated dependencies [[`9d988f2`](https://github.com/ngrok/mantle/commit/9d988f203ddd4a7a433871478adfa1fd4e21af34)]:
  - @ngrok/mantle-server-syntax-highlighter@1.1.7

## 1.0.16

### Patch Changes

- [#1306](https://github.com/ngrok/mantle/pull/1306) [`2e589b4`](https://github.com/ngrok/mantle/commit/2e589b4220910d01a2406e3a4a40d97247e3b0f3) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - fix: publish a lean package.json — prune custom export conditions and slim the manifest

  The `@ngrok/src-live-types` custom export condition only exists so workspace apps can resolve live source files during local development, but it was shipping in the published `package.json#exports` and pointing npm consumers at `./src/...` paths that are excluded from the tarball. A new `prepack`/`postpack` lifecycle pair now rewrites the manifest while the tarball is created and restores the pristine `package.json` afterwards:

  - strips all custom (`@`-namespaced) export conditions
  - collapses `{ types, import }` export entries to plain string targets (TypeScript resolves the sibling `.d.ts` automatically)
  - drops `import` conditions that duplicate `default` (the CSS entries)
  - removes `devDependencies` and `scripts`, which consumers never install or run

  Published packages now expose only standard conditions pointing at `dist`, and each release permanently adds roughly half as much metadata to the npm packument.

- Updated dependencies [[`2e589b4`](https://github.com/ngrok/mantle/commit/2e589b4220910d01a2406e3a4a40d97247e3b0f3)]:
  - @ngrok/mantle-server-syntax-highlighter@1.1.6

## 1.0.15

### Patch Changes

- [#1262](https://github.com/ngrok/mantle/pull/1262) [`9fb7022`](https://github.com/ngrok/mantle/commit/9fb7022ab10e8cad05bd656bd1a518c4d1e1f7b4) Thanks [@dependabot](https://github.com/apps/dependabot)! - Bump `oxc-parser` to `0.137.0`.

- Updated dependencies [[`9fb7022`](https://github.com/ngrok/mantle/commit/9fb7022ab10e8cad05bd656bd1a518c4d1e1f7b4)]:
  - @ngrok/mantle-server-syntax-highlighter@1.1.5

## 1.0.14

### Patch Changes

- [#1241](https://github.com/ngrok/mantle/pull/1241) [`f7be346`](https://github.com/ngrok/mantle/commit/f7be3464e3d823d8d8e8c1c96ba15b615871ddb7) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Update the `oxc-parser` dependency to `0.136.0` (from `0.135.0`).

- Updated dependencies [[`f7be346`](https://github.com/ngrok/mantle/commit/f7be3464e3d823d8d8e8c1c96ba15b615871ddb7)]:
  - @ngrok/mantle-server-syntax-highlighter@1.1.4

## 1.0.13

### Patch Changes

- [#1223](https://github.com/ngrok/mantle/pull/1223) [`6dc792c`](https://github.com/ngrok/mantle/commit/6dc792c0f2f91f4f2b34f5ef5ccc4f5a06b2c1b5) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Bump the `vite` peer dependency range to `^8.0.16`.

- Updated dependencies [[`6dc792c`](https://github.com/ngrok/mantle/commit/6dc792c0f2f91f4f2b34f5ef5ccc4f5a06b2c1b5)]:
  - @ngrok/mantle-server-syntax-highlighter@1.1.3

## 1.0.12

### Patch Changes

- [#1218](https://github.com/ngrok/mantle/pull/1218) [`61d638d`](https://github.com/ngrok/mantle/commit/61d638d19f71af96341bd7d128f684b2a4e2c7ba) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - `mantleCodeVitePlugin` now inlines nested `mantleCode` fragment interpolations at build time. Interpolating `someFragment.code` into another `mantleCode` template — where `someFragment` is a top-level `mantleCode` `const` declared earlier in the same module, or a named import of a directly-exported top-level `mantleCode` `const` from another module — splices the fragment's source into the highlighted output. The embedded code is highlighted line-for-line in its host language (correct line numbers, folding, and copy text) and pays no runtime substitution cost. Nested fragments resolve recursively across modules; interpolations that can't be resolved statically fall back to the existing runtime placeholder behavior, and an unresolved imported `.code` reference emits a build warning.

- Updated dependencies []:
  - @ngrok/mantle-server-syntax-highlighter@1.1.2

## 1.0.11

### Patch Changes

- [#1207](https://github.com/ngrok/mantle/pull/1207) [`b9fadca`](https://github.com/ngrok/mantle/commit/b9fadca2c3e8ba923ece71578af197aca4220162) Thanks [@dependabot](https://github.com/apps/dependabot)! - Lint cleanup round. No behavior changes.
  - Dropped a redundant `?? {}` fallback in an object spread inside `mantleCodeRehypePlugin` (`...preNode.properties` is safe to spread directly — falsy values in object spreads are no-ops).
  - Tightened `vi.fn` generics in tests.

- Updated dependencies [[`b9fadca`](https://github.com/ngrok/mantle/commit/b9fadca2c3e8ba923ece71578af197aca4220162)]:
  - @ngrok/mantle-server-syntax-highlighter@1.1.2

## 1.0.10

### Patch Changes

- [#1197](https://github.com/ngrok/mantle/pull/1197) [`c30e470`](https://github.com/ngrok/mantle/commit/c30e4707bb8d12ae80e59c8f89e87920a2d0d478) Thanks [@dependabot](https://github.com/apps/dependabot)! - Bump `oxc-parser` to `0.130.0`.

- [#1191](https://github.com/ngrok/mantle/pull/1191) [`e09de2d`](https://github.com/ngrok/mantle/commit/e09de2da092c6f0ab91251ea4a00170593a985a5) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Add `field` to the generated Mantle component name metadata so plugin allowlists and import analysis recognize the new Field component subpath.

- Updated dependencies [[`c30e470`](https://github.com/ngrok/mantle/commit/c30e4707bb8d12ae80e59c8f89e87920a2d0d478)]:
  - @ngrok/mantle-server-syntax-highlighter@1.1.1

## 1.0.9

### Patch Changes

- Updated dependencies [[`51a0864`](https://github.com/ngrok/mantle/commit/51a086436804f6c4f576b9021e0e3ab7699e8907), [`51a0864`](https://github.com/ngrok/mantle/commit/51a086436804f6c4f576b9021e0e3ab7699e8907), [`51a0864`](https://github.com/ngrok/mantle/commit/51a086436804f6c4f576b9021e0e3ab7699e8907)]:
  - @ngrok/mantle-server-syntax-highlighter@1.1.0

## 1.0.8

### Patch Changes

- [#1155](https://github.com/ngrok/mantle/pull/1155) [`0f0b607`](https://github.com/ngrok/mantle/commit/0f0b607813fbe15c969aa1e3e3c0ac9a4d27c8fe) Thanks [@dependabot](https://github.com/apps/dependabot)! - Update `tailwindcss` and `@tailwindcss/vite` to `4.2.4`.

- Updated dependencies []:
  - @ngrok/mantle-server-syntax-highlighter@1.0.4

## 1.0.7

### Patch Changes

- [#1107](https://github.com/ngrok/mantle/pull/1107) [`4d35209`](https://github.com/ngrok/mantle/commit/4d35209cd3ec2b15215e51107aec3de007768aa6) Thanks [@forzalupo](https://github.com/forzalupo)! - Internal: switch `=== undefined` / `!== undefined` checks to `== null` / `!= null` for consistency with the project's nullish-equality style. No behavior change.

- Updated dependencies []:
  - @ngrok/mantle-server-syntax-highlighter@1.0.4

## 1.0.6

### Patch Changes

- [#1126](https://github.com/ngrok/mantle/pull/1126) [`545a09d`](https://github.com/ngrok/mantle/commit/545a09d77c0503f7dfdffe5eb1cde69d59aa65f4) Thanks [@dependabot](https://github.com/apps/dependabot)! - Bump oxc-parser from 0.124.0 to 0.125.0

- Updated dependencies []:
  - @ngrok/mantle-server-syntax-highlighter@1.0.4

## 1.0.5

### Patch Changes

- [#1141](https://github.com/ngrok/mantle/pull/1141) [`f82feb8`](https://github.com/ngrok/mantle/commit/f82feb81f2da67d332962cd16e138bd0de9ae45b) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Fix several code fence metastring parsing bugs in `mantleCodeRehypePlugin`:
  - `mantleShowLineNumbers`, `mantleCollapsible`, and `mantleDisableCopy` are now stringified on HAST `<pre>` properties. Previously, boolean `false` values were dropped during HAST→JSX compilation, causing `showLineNumbers=false` fence meta to be silently ignored (the rendered `<pre>` ended up with `data-mantle-line-numbers="true"` and no left padding).
  - `collapsible=true`, `collapsible=false`, and `collapsible="true"` in fence meta are no longer silently dropped. The `collapsible` key now accepts the same bare-flag, key-value, and quoted-value forms as `disableCopy`.
  - When a key appears multiple times in fence meta (e.g. `title="first" title="second"`), `getMetaValue` now returns the last value, matching `parseMetastring` semantics. Previously it returned the first.
  - `tokenizeMetastring` now splits on tabs, newlines, and carriage returns in addition to spaces. Previously only literal spaces were treated as token separators, so meta like `title="Foo"\tcollapsible` was lexed as a single token.

- Updated dependencies []:
  - @ngrok/mantle-server-syntax-highlighter@1.0.4

## 1.0.4

### Patch Changes

- Updated dependencies [[`0c20cf7`](https://github.com/ngrok/mantle/commit/0c20cf736429dd6e0085d4f38affce86f7de8ee9)]:
  - @ngrok/mantle@0.68.3
  - @ngrok/mantle-server-syntax-highlighter@1.0.4

## 1.0.3

### Patch Changes

- [#1116](https://github.com/ngrok/mantle/pull/1116) [`5b0be5a`](https://github.com/ngrok/mantle/commit/5b0be5a7ffb8372984477da21cbb85b139d04e3f) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - no-op patch to verify publish CI

- Updated dependencies [[`ea340f6`](https://github.com/ngrok/mantle/commit/ea340f6307f3f0f229395783c0c21f7a35363688), [`5b0be5a`](https://github.com/ngrok/mantle/commit/5b0be5a7ffb8372984477da21cbb85b139d04e3f)]:
  - @ngrok/mantle-server-syntax-highlighter@1.0.3
  - @ngrok/mantle@0.68.2

## 1.0.2

### Patch Changes

- [#1112](https://github.com/ngrok/mantle/pull/1112) [`ad24f11`](https://github.com/ngrok/mantle/commit/ad24f11155af28d4b3141c1fb77416577bc75ed2) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Add README documentation for npm packages, switch to ES2025 preset

- Updated dependencies [[`d46e3b3`](https://github.com/ngrok/mantle/commit/d46e3b3fbdcdf561db1d90e89afc8cca8e374be3), [`ad24f11`](https://github.com/ngrok/mantle/commit/ad24f11155af28d4b3141c1fb77416577bc75ed2)]:
  - @ngrok/mantle@0.68.1
  - @ngrok/mantle-server-syntax-highlighter@1.0.2

## 1.0.1

### Patch Changes

- [#1099](https://github.com/ngrok/mantle/pull/1099) [`4a81875`](https://github.com/ngrok/mantle/commit/4a81875621f00eb46887b2b83ab5e6021465d7d4) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Bump dependencies: oxc-parser to 0.123.0, update vite peer dependency to ^8

- [#1082](https://github.com/ngrok/mantle/pull/1082) [`383d538`](https://github.com/ngrok/mantle/commit/383d53821a264e59c4532f45e07818f541bfb686) Thanks [@dependabot](https://github.com/apps/dependabot)! - Update dependencies

- Updated dependencies [[`4a81875`](https://github.com/ngrok/mantle/commit/4a81875621f00eb46887b2b83ab5e6021465d7d4), [`383d538`](https://github.com/ngrok/mantle/commit/383d53821a264e59c4532f45e07818f541bfb686), [`ab6da43`](https://github.com/ngrok/mantle/commit/ab6da43e32e3e2e2dadf29aa8d99fcb2738569f4), [`2be1db1`](https://github.com/ngrok/mantle/commit/2be1db1ffb23bb5719181f73090ef28d7e19a50f), [`41ce842`](https://github.com/ngrok/mantle/commit/41ce842787bcfb6386d94cba4e5e495a298c5a22)]:
  - @ngrok/mantle@0.68.0
  - @ngrok/mantle-server-syntax-highlighter@2.0.0

## 1.0.0

### Minor Changes

- [#1018](https://github.com/ngrok/mantle/pull/1018) [`f27c01f`](https://github.com/ngrok/mantle/commit/f27c01fc3291344380f32018d65cd6d21381fcaa) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - CodeBlock: replace PrismJS with Shiki for build-time syntax highlighting, removing Shiki/Prism from the browser bundle

### Patch Changes

- Updated dependencies [[`36e5921`](https://github.com/ngrok/mantle/commit/36e59211a9b76f0542d2551bd28d858449d3a131), [`f27c01f`](https://github.com/ngrok/mantle/commit/f27c01fc3291344380f32018d65cd6d21381fcaa), [`36e5921`](https://github.com/ngrok/mantle/commit/36e59211a9b76f0542d2551bd28d858449d3a131), [`36e5921`](https://github.com/ngrok/mantle/commit/36e59211a9b76f0542d2551bd28d858449d3a131), [`54743f1`](https://github.com/ngrok/mantle/commit/54743f1deee01709952fcf5222e0ea205c282e5d)]:
  - @ngrok/mantle@0.67.0
  - @ngrok/mantle-server-syntax-highlighter@1.0.0

## 0.1.5

### Patch Changes

- [#1061](https://github.com/ngrok/mantle/pull/1061) [`1b0e722`](https://github.com/ngrok/mantle/commit/1b0e7227c79396b48d4845b0ed5b534085aa91f7) Thanks [@dependabot](https://github.com/apps/dependabot)! - Bump `vite` peer dependency to `>=7.3.1`.

- Updated dependencies [[`1b0e722`](https://github.com/ngrok/mantle/commit/1b0e7227c79396b48d4845b0ed5b534085aa91f7)]:
  - @ngrok/mantle@0.66.13

## 0.1.4

### Patch Changes

- [#1044](https://github.com/ngrok/mantle/pull/1044) [`723bce4`](https://github.com/ngrok/mantle/commit/723bce46be2929ee326e6df0ed697a9632747852) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Fix `mantleTwSourcePlugin` correctness for code-split mantle builds:
  - `@source` directives now emit two patterns per component — an exact entry stub (`button.js`) and a hashed-chunk glob (`button-*.js`) — so Tailwind scans both the named re-export file and the code-split chunk that actually contains class strings. A single `button*.js` glob was intentionally avoided because it would also match prefix-sharing names like `button` matching `button-group`.
  - Added `resolveId` hook for module-graph-aware component tracking: catches mantle imports from workspace packages outside `include` and transitive mantle-internal imports that the directory scan missed.
  - Added `closeBundle` hook that writes the precise set (directory scan ∪ `resolveId` intercepts ∪ allowlist) after a production build. SSR builds are skipped so only the client build's complete component set is written — the server build resolves fewer components and must not overwrite it.
  - Added `allowlist` option to explicitly include components regardless of scanner detection. Accepts PascalCase (`"CommandDialog"`) or kebab-case (`"command-dialog"`).

## 0.1.3

### Patch Changes

- [#1042](https://github.com/ngrok/mantle/pull/1042) [`8a46bc2`](https://github.com/ngrok/mantle/commit/8a46bc2908188e5e381fb639372278b2a9cafff4) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - fix(mantle-vite-plugins): exclude `.css?url` imports from `@source` injection

  Vite query suffixes like `?url` on CSS imports (e.g. `@ngrok/mantle/mantle-dark.css?url`) were not being filtered out, causing spurious `@source` directives like `@source "../node_modules/@ngrok/mantle/dist/mantle-dark.css?url.js"` to appear in the generated CSS block. The fix strips the query suffix before checking the file extension.

## 0.1.2

### Patch Changes

- [#1040](https://github.com/ngrok/mantle/pull/1040) [`82f1cd9`](https://github.com/ngrok/mantle/commit/82f1cd9c67b14e33d06c97028b2e38555e10ced8) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Rename `mantleSourcePlugin` → `mantleTwSourcePlugin` (and `MantleSourcePluginOptions` → `MantleTwSourcePluginOptions`) to clarify that this plugin is strictly for generating Tailwind `@source` directives for mantle component imports; default `include` to `["app"]` instead of `["src"]`; fix pnpm workspaces generating content-addressed `.pnpm/` paths in `@source` directives by resolving `@ngrok/mantle` via the `node_modules` symlink rather than `require.resolve`

## 0.1.1

### Patch Changes

- [#1036](https://github.com/ngrok/mantle/pull/1036) [`1521814`](https://github.com/ngrok/mantle/commit/1521814c50e01d0111bd03696c9698dd718ff5f1) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Add `@ngrok/mantle-vite-plugins` package and `source-all.css`, optimize `mantle.css`

  **New: `@ngrok/mantle-vite-plugins`**

  A new package that exports `mantleSourcePlugin` — a Vite plugin that writes targeted Tailwind `@source` directives into your global CSS file for only the `@ngrok/mantle` components your app actually imports. Scans `.ts`, `.tsx`, `.js`, `.jsx`, `.mdx`, and `.md` files. Uses a disk-write approach (required because `@tailwindcss/vite` reads CSS from disk at startup before Vite's transform pipeline runs).

  **New: `@ngrok/mantle/source-all.css`**

  A zero-configuration alternative to `mantleSourcePlugin`. Import it alongside `mantle.css` to tell Tailwind to scan all mantle component dist files:

  ```css
  @import "@ngrok/mantle/mantle.css";
  @import "@ngrok/mantle/source-all.css";
  ```

  Use this for apps that import most or all mantle components. Use `mantleSourcePlugin` for apps that import a subset and want the smallest possible CSS output.

  **`mantle.css` optimizations**
  - Removed `@source "../dist"` — source scanning is now opt-in via `source-all.css` or `mantleSourcePlugin`
  - Deduplicated `--color-gray-*` in light/dark themes using `var(--color-neutral-*)` aliases
  - Removed 21 light-theme color overrides (`neutral-50`–`neutral-900`, all `red-*` shades) that were identical to Tailwind v4 defaults
  - Moved ~60 semantic tokens (`--background-color-base`, etc.) from `@theme {}` to `@theme inline {}` to stop generating unused utility classes like `bg-background-color-base`

- Updated dependencies [[`1521814`](https://github.com/ngrok/mantle/commit/1521814c50e01d0111bd03696c9698dd718ff5f1), [`1521814`](https://github.com/ngrok/mantle/commit/1521814c50e01d0111bd03696c9698dd718ff5f1), [`1521814`](https://github.com/ngrok/mantle/commit/1521814c50e01d0111bd03696c9698dd718ff5f1)]:
  - @ngrok/mantle@0.66.7
