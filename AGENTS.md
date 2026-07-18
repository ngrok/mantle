# Mantle Design System - Agent Guide

ngrok's UI library and design system built with React, TypeScript, Radix, and Tailwind CSS. This is a monorepo managed with pnpm workspaces and Turborepo.

This file follows the [AGENTS.md standard](https://agents.md) and is the canonical agent instructions file for every harness we use (amp, Claude Code, Codex, Cursor, etc.). `CLAUDE.md` (required by Claude Code) is a symlink to this file — edit `AGENTS.md` only, never the symlink.

## Non-Negotiable Agent Contract

This file and [CONVENTIONS.md](./CONVENTIONS.md) are active instructions, not background reading. Work is incomplete until the agent has verified its own changed files against the conventions.

Before editing:

- Read the relevant [CONVENTIONS.md](./CONVENTIONS.md) sections for the files being changed.
- When designing new components, hooks, or public API, also read the [Philosophy page](./apps/www/app/docs/philosophy.mdx) (published at [mantle.ngrok.com/philosophy](https://mantle.ngrok.com/philosophy)) — it explains the design rationale the conventions distill. It is context, not a rulebook: where the two differ, CONVENTIONS.md governs.
- Search before creating helpers, hooks, components, parsers, formatters, utilities, or dependencies — prefer existing tested code and package subpath exports over reimplementation. Inspect the smallest relevant scope first (`packages/mantle/src`, then the owning app).
- For dependency changes, check `pnpm-workspace.yaml` and follow the catalog / exact-version rules.

Before the final response:

- Inspect `git diff --name-only` and `git diff` for the changed files.
- Re-check those files against the relevant [CONVENTIONS.md](./CONVENTIONS.md) sections.
- Fix convention drift before reporting completion.
- Run the targeted [verification](#verification) commands, or explicitly say why they were not run.
- Include a brief `Conventions pass:` note summarizing what was checked.

Verification cadence: you do **not** need to run lint/typecheck/build/test after every individual edit. While rapidly iterating on a change, keep editing freely without validating each intermediate step. Run the targeted verification commands once a coherent chunk of work is done — and before the final response — rather than treating every keystroke as a checkpoint.

Required diff-audit checklist:

- JSDoc: exported functions, hooks, components, and prop types are documented; required `@example` blocks are present.
- Tests: bug fixes have regression tests; business logic has edge-case tests (transformations, validation, conditional rendering, state machines, parsing/formatting).
- TypeScript: no `any`, no forbidden `as Type` assertions, no non-null assertions (`value!`), no `React.FC`; prefer `type` over `interface`.
- Nullish checks: `== null` / `!= null`, not `=== undefined` / `!== undefined`.
- Imports: relative paths in `packages/`, `~/...` aliases in `apps/`; named exports; `import type` for type-only imports.
- className: composed with `cx` from `@ngrok/mantle/cx` — no string interpolation, `+`, or ternaries inside `className`.
- Compound components: single-level POJO namespace — no nested namespaces; no `*Props` prop-bag passthrough props (`contentProps`, `triggerProps`, …) — expose the internal element as a compound part instead.
- Deps: exact-pinned versions (no `^`/`~`); shared deps go through the `catalog:` in `pnpm-workspace.yaml`.

## Setup

From a fresh clone, run `./scripts/setup`. It installs [mise](https://mise.jdx.dev/) (if missing), provisions Node and pnpm at the versions pinned in `.nvmrc` and `package.json#packageManager`, and runs `pnpm install --frozen-lockfile`.

For non-interactive environments without shell activation, prefix workspace commands with `mise x --` (e.g., `mise x -- pnpm -w run build`). Run `mise run doctor` to verify the active toolchain matches committed pins.

## Code Style & Conventions

All rules live in [CONVENTIONS.md](./CONVENTIONS.md) and are mandatory. The `@./CONVENTIONS.md` directive below inlines it automatically for Claude Code; other harnesses should follow the link.

@./CONVENTIONS.md

## Project Structure

- **Apps** (`apps/`): `www` (documentation site, React Router 7)
- **Packages** (`packages/`):
  - `mantle` (UI component library, built with tsdown)
  - `mantle-vite-plugins` (Vite + rehype plugins for code-block highlighting and Tailwind CSS source optimization)
  - `mantle-server-syntax-highlighter` (server-side syntax highlighting engine powered by Shiki)
- **Config** (`config/`): `tsconfig` (shared TypeScript configs via `@cfg/tsconfig`)

```
packages/mantle/src/components/my-component/
├── index.ts              # Re-exports
├── my-component.tsx      # Component implementation
└── my-component.test.tsx # Tests
```

## Commands

All commands run from workspace root (leverages turbo caching):

- `pnpm -w run start` — Start docs site with hot reload
- `pnpm -w run build` — Build everything
- `pnpm -w run test` — Run tests (vitest)
- `pnpm -w run typecheck` — Type check
- `pnpm -w run lint` — Lint (oxlint)
- `pnpm -w run lint:fix` — Lint and auto-fix
- `pnpm -w run fmt:check` — Check formatting (oxfmt)
- `pnpm -w run fmt` — Format and auto-fix
- `pnpm -w run clean` — Clean build artifacts
- `pnpm -w run changeset` — Create changeset for publishing

Use `-F` to scope: `pnpm -w run build -F @ngrok/mantle`, `pnpm -w run test -F @ngrok/mantle`

## Verification

Run these from the workspace root once a coherent chunk of work is done and before the final response (see the Agent Contract's verification cadence) — not after every edit. Ensure they pass:

1. `pnpm -w run lint` — 0 errors
2. `pnpm -w run fmt:check` — 0 errors (run `pnpm -w run fmt` to auto-fix)
3. `pnpm -w run typecheck` — 0 errors
4. `pnpm -w run test` — if you modified `packages/mantle`

## Package Management

- All external dependencies MUST use exact, pinned versions (no `^` or `~`): `pnpm -w add -E <package> -F @ngrok/mantle`
- Root dev deps: `pnpm -w add -D -E <package>`
- Workspace deps: `pnpm -w add -E @ngrok/mantle -F @app/www`
- Package names: Apps use app names, packages use `@ngrok/` prefix
- **IMPORTANT**: Agents MUST explicitly call out violations of these conventions (e.g., unpinned versions)

## Technology Stack

- **React 19** only; `@ngrok/mantle` requires peer `react@^19` — `ref` is a regular prop, never use `forwardRef` — TypeScript, **Tailwind CSS 4**, vitest, pnpm, **Node.js 24**, Turborepo
- Radix UI, Ariakit, Headless UI, class-variance-authority
- **Icons**: `@phosphor-icons/react` primarily, custom ngrok icons via `@ngrok/mantle/icons`
- **Theme**: Built-in light/dark mode with ThemeProvider and FOUC prevention

## Read-Only Directories

- **`local/`** (gitignored; may not exist in every checkout): the encouraged location for read-only reference clones of related repos (e.g. `git@github.com:ngrok-private/frontend.git` → `local/frontend`). Treat these checkouts as read-only references — **never modify files in `local/`**, and do not edit, build, or commit from them as part of mantle work.

## Common Issues & Solutions

- **Build failures**: Run `pnpm run clean` then `pnpm run build`
- **Type errors**: Ensure all packages are built before typechecking
- **Hot reload issues**: Restart dev server or clear `.react-router/` cache
- **Toolchain drift**: Run `mise run doctor` to verify Node and pnpm match committed pins. Re-run `./scripts/setup` if they don't.
- **Lockfile drift** (CI flags `mise.lock` out of sync with `.nvmrc` / `package.json#packageManager`): bump the source pin in `.nvmrc` or `package.json#packageManager`, then `mise run relock && mise install` and commit `mise.lock` alongside the pin change.

## Publishing Changes

```bash
pnpm run changeset              # Create changeset
pnpm run changeset:version      # Update versions
pnpm run changeset:publish      # Build and publish
```
