# `cx` vendored engine

This directory vendors the class-merge **engine** from [`cnfast@0.0.8`](https://github.com/aidenybai/cnfast)
(MIT) — itself a faster, byte-for-byte port of [`clsx`](https://github.com/lukeed/clsx)
(Luke Edwards) + [`tailwind-merge`](https://github.com/dcastil/tailwind-merge) (Dany
Castillo) — replacing the former runtime dependencies on `clsx` and `tailwind-merge`. The
`cx` function itself lives in [`../cx.ts`](../cx.ts) (our code) and calls into this engine.

It is **excluded from oxlint and oxfmt** (see `.oxlintrc.json#ignorePatterns` and
`.prettierignore`) so it stays close to upstream and re-syncable. Treat it as read-only:
do not refactor it to match repo conventions.

## Layout

Mirrors `cnfast/packages/cnfast/src` so internal import paths stay identical to upstream:

- `clsx.ts` — upstream `src/clsx.ts` (`resolveClassValue` / `clsx`).
- `lib/*` — upstream `src/lib/*` (the tailwind-merge engine + the baked default config).
  `../cx.ts` calls `lib/tw-merge.ts` (whole-string result cache) and `lib/merge-template.ts`
  (tagged-template call-site cache) directly.

Upstream's `cn` dispatcher (`src/index.ts`) is intentionally **not** vendored — `../cx.ts`
reimplements that small variadic/tagged-template dispatch as ordinary mantle code. The CLI
(`src/cli`), benchmarks, and scripts are not vendored either.

## Mantle overrides

The only hand-edits to upstream live in [`lib/default-config.ts`](./lib/default-config.ts),
marked with `--- mantle override ---`. They bake in what `cx` previously did via
`extendTailwindMerge`, so no extend call is needed:

1. **`em` spacing scale** — `em` is appended to `theme.spacing`, so `w-em`, `h-em`, `p-em`,
   `gap-em`, … are recognized spacing utilities and conflict-resolve against `w-4`, `p-2`, ….
2. **`text-mono` / `text-size-inherit`** — appended to the `font-size` class group, so they
   conflict-resolve against `text-base`, `text-xl`, ….

## Normalization applied on vendoring

Upstream source is copied verbatim except:

1. A one-line provenance header is prepended to each file.
2. Relative import specifiers get explicit `.js` extensions (required by the package's
   `NodeNext` module resolution).
3. Type-only imports are rewritten to `import type` / inline `type` (required by
   `verbatimModuleSyntax`).
4. The two `default-config.ts` overrides above.

## Re-syncing to a newer cnfast

1. Download `packages/cnfast/src/{index.ts,clsx.ts,lib/*}` from the target tag.
2. Re-apply steps 1–3 above (deterministic: see `scripts` history / the original vendoring
   commit), then re-apply the two `default-config.ts` overrides.
3. Run `cx`'s parity suite (`pnpm -w run test -F @ngrok/mantle cx`): the `parity.json` fixture
   asserts byte-identical output against the behavior frozen at vendoring time.
