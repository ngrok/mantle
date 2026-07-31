# mantleTwSourcePlugin: Research Log

## Background

`mantleTwSourcePlugin` injects Tailwind CSS `@source` directives into the app's global CSS file for only the `@ngrok/mantle` components the app actually uses, so Tailwind doesn't scan the entire mantle `dist/` directory.

The current (shipped) implementation uses a **directory scan**: it walks the directories in `include` looking for `@ngrok/mantle/<name>` import strings in source files.

---

## Problem 1 — Monorepo workspace packages (original motivation)

Directory scanning breaks down in monorepos where the app depends on workspace packages that themselves import mantle. Example: `apps/www` depends on `packages/ui`, and `packages/ui/src/severity.ts` imports `@ngrok/mantle/badge`. If you only scan `apps/www/app`, you miss `badge`. If you add `packages/ui/src` to `include`, you pull in _every_ mantle component imported anywhere in that package — not just the ones reachable from `apps/www`.

**Proposed fix (deferred):** Use Vite's `resolveId` hook to intercept every `@ngrok/mantle/<name>` import Vite actually resolves during the session. Module-graph-aware: only sees imports reachable from the app's entry points, including through workspace packages, without overcounting.

### `resolveId` two-pass design

1. **Startup (`configResolved`)** — Read the existing `@source` block from the CSS file (`parseComponentsFromCssFile`) to seed `knownComponents`. On first cold start, fall back to a directory scan of `include` to bootstrap.
2. **Session (`resolveId`)** — Intercept every `@ngrok/mantle/<name>` specifier. Accumulate into `seenComponents`.
   - Dev: debounce-write the CSS with `knownComponents ∪ seenComponents` when a new component is first seen.
   - Prod: `closeBundle` writes `seenComponents` (precise set for this build), removing stale entries.

### `resolveId` known gaps / risks (never shipped)

1. **SSR double-build**: React Router runs a client build then a server build. `closeBundle` fires twice. The second call (server) may have a smaller `seenComponents` than the client, overwriting the CSS with fewer components. The overwrite would drop client-only components like modals and tooltips.
2. **First cold start in prod CI**: No existing `@source` block → bootstrap via directory scan. If `resolveId` then fires zero times, the guard silently no-ops, leaving stale bootstrapped state.
3. **`resolveId` timing in dev**: Fires lazily as you visit routes. Fresh clone + dev start → missing components until you visit those routes.
4. **No integration test**: All tests are unit tests. Plugin hooks are unverified against a real Vite instance.

**Status:** `parseComponentsFromCssFile` was implemented in `internals.ts` and is tested. The plugin itself was reverted to the directory-scan implementation pending these gaps.

---

## Problem 2 — Transitive imports within mantle itself (discovered 2026-03-09)

Mantle components import each other directly. For example, `command.tsx` imports from the `dialog` component. An app that imports `@ngrok/mantle/command` but never directly imports `@ngrok/mantle/dialog` will only get an `@source` directive for `command` — dialog styles will be missing.

The directory scan only finds imports the _app_ makes directly. It does not follow the mantle-internal dependency graph. This is a correctness bug, not a performance gap.

**Attempted escape hatch:** Added an `allowlist` option to `MantleTwSourcePluginOptions` so consumers can explicitly name components the scanner misses. Accepts PascalCase (`"Dialog"`) or kebab-case (`"dialog"`). Merged with scanned results before writing `@source` block.

**This turned out not to work** — see Problem 3.

---

## Problem 3 — Entry-point stubs contain no classes (discovered 2026-03-09)

**This is the root cause that makes the entire plugin ineffective.**

When tsdown builds mantle with multiple entry points, rolldown uses code splitting: it extracts shared code into hashed chunk files (e.g. `dialog-BswTx6oS.js`) and the named entry files become thin re-export stubs:

```js
// dist/dialog.js — the file @source points at
export { t as Dialog } from "./dialog-BswTx6oS.js";
```

All Tailwind class strings live in the chunk files. Tailwind's `@source` scanner reads file contents with regex — it does not execute JavaScript or follow re-exports. So it scans `dist/dialog.js`, finds no class strings, and moves on. Tailwind discovers no styles.

This means:

- `@source "dist/dialog.js"` → finds nothing.
- Adding `"Dialog"` to the `allowlist` → emits `@source "dist/dialog.js"` → finds nothing.
- The per-component `@source` optimization is a no-op for any app using the current build output.

### Attempted fix: disable code splitting

Setting `outputOptions: { codeSplitting: false }` in tsdown fails:

```
[INVALID_OPTION] multiple inputs are not supported when "output.codeSplitting" is false
```

When you disable splitting, rolldown hard-requires a single entry point. Not viable for mantle's multi-entry build. There is no tsdown/rolldown option to inline chunks into named entries while keeping multiple entries.

### Fix shipped (2026-03-09)

Instead of pointing `@source` at the exact entry stub, emit two patterns per component:

```css
@source "../node_modules/@ngrok/mantle/dist/dialog.js";
@source "../node_modules/@ngrok/mantle/dist/dialog-*.js";
```

The second pattern matches the hashed code-split chunk (e.g. `dialog-BswTx6oS.js`) regardless of its hash. Tailwind scans both files: the stub (which re-exports) and the chunk (which contains the actual class strings). This sidesteps the code-splitting problem without requiring build changes.

The fix intentionally avoids a single `dialog*.js` glob because it is overly broad: `alert*.js` also matches `alert-dialog-<hash>.js`, causing Tailwind to scan unrelated components and undermining the per-component optimization.

---

## Current State

The plugin is **fixed and operational** as of 2026-03-09. The two-pattern `@source` approach correctly discovers class strings from hashed code-split chunks without requiring build output changes.

Additionally:

- `resolveId` module-graph tracking was added, fixing Problems 1 & 2 (monorepo workspace packages and transitive mantle-internal imports).
- Production builds write a precise, shrinkable set (no stale prior-run accumulation).
- SSR double-build safety: `closeBundle` skips server builds, so the server build's smaller component set never overwrites the client build's complete one.

---

## Revised Direction

The per-entry-point `@source` model cannot be fixed without changing either the build output or the scanning strategy:

| Approach                            | Status                                                                                    |
| ----------------------------------- | ----------------------------------------------------------------------------------------- |
| `resolveId` module graph            | ✅ Shipped — fixes problems 1 & 2                                                         |
| Two-pattern `@source` globs         | ✅ Shipped — fixes problem 3 (`name.js` + `name-*.js` covers stub and chunk)              |
| `codeSplitting: false`              | Blocked — rolldown rejects multiple entries with splitting disabled                       |
| Chunk manifest (entry → chunks)     | Not emitted by rolldown/tsdown; hashes change every build                                 |
| `@source "dist/"` (whole directory) | Works but is identical to `source-all.css` — zero optimization; still valid as a fallback |
| Tailwind `@plugin` approach         | More precise (explicit class registration, no scanning) — viable future direction         |
