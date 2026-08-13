# Mantle Design System - Agent Guide

ngrok's UI library and design system built with React, TypeScript, Radix, and Tailwind CSS. This is a monorepo managed with pnpm workspaces and Turborepo.

This file follows the [AGENTS.md standard](https://agents.md) and is the canonical agent instructions file for every harness we use (amp, Claude Code, Codex, Cursor, etc.). `CLAUDE.md` (required by Claude Code) is a symlink to this file — edit `AGENTS.md` only, never the symlink.

## Non-Negotiable Agent Contract

This file, [CONVENTIONS.md](./CONVENTIONS.md), and [COMPONENT_SPEC.md](./COMPONENT_SPEC.md) are active instructions, not background reading. Work is incomplete until the agent has verified its own changed files against them.

The three divide as follows: **CONVENTIONS.md** governs code and prose style everywhere in the monorepo (including comments, JSDoc, changesets, commit messages, and PR descriptions), **COMPONENT_SPEC.md** is the self-contained standard for authoring a `@ngrok/mantle` component (principles, artifacts, API shape, JSDoc, CSS-variable and data-attribute documentation, docs page, tests, wiring, changeset, and the audit procedure), and this file governs how you work. On a component question where the spec and the conventions appear to disagree, COMPONENT_SPEC.md governs.

[VERSIONING.md](./VERSIONING.md) decides one thing and decides it alone: which bump a changeset takes. Read it before you write one. Mantle is `0.x`, so stock semver is wrong here — there is no `major`, breaking changes ride a `minor`, and additive changes are a `patch`. It outranks every other file on the bump, including this one, and a maintainer's hand-set bump is not yours to correct.

The spec is the bar for new components and for the parts of a component you are changing; existing components are brought up to it over time, not in a sweep. See its [Scope and status](./COMPONENT_SPEC.md#scope-and-status).

Before editing:

- Read the relevant [CONVENTIONS.md](./CONVENTIONS.md) sections for the files being changed.
- When adding or changing anything under `packages/mantle/src/components/` — or its docs page, tests, or wiring — read [COMPONENT_SPEC.md](./COMPONENT_SPEC.md) first and work its [review checklist](./COMPONENT_SPEC.md#11-review-checklist) before reporting completion. It supersedes both this file and CONVENTIONS.md on component questions, so you do not need to reconcile them yourself.
- When designing hooks, utilities, or other public API outside `components/`, read the [Philosophy page](./apps/www/app/docs/philosophy.mdx) (published at [mantle.ngrok.com/philosophy](https://mantle.ngrok.com/philosophy)) — it explains the design rationale the conventions distill. It is context, not a rulebook: where the two differ, CONVENTIONS.md governs. For components, [COMPONENT_SPEC.md §0](./COMPONENT_SPEC.md#0-principles) already distills it into rules.
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

- **Components: work [COMPONENT_SPEC.md's review checklist](./COMPONENT_SPEC.md#11-review-checklist) against the diff.** It is the complete list for anything under `packages/mantle/src/components/` or its docs, tests, and wiring — artifacts, API shape, `data-slot` and `asChild`, JSDoc, CSS variables and data attributes documented in **both** the JSDoc and the docs-page API reference, and the wiring that no verification command catches.
- JSDoc: exported functions, hooks, components, and prop types are documented; required `@example` blocks are present.
- Changesets: the bump matches [VERSIONING.md](./VERSIONING.md), and every published package the diff touches has one. Additive is a `patch`; `major` is never correct.
- Prose: comments, JSDoc, changesets, decision docs, docs-page copy, the commit subject, and the PR description follow [CONVENTIONS.md § Writing](./CONVENTIONS.md#writing) — active voice, simple tenses, one idea per sentence, condition first, no comment that restates the code, and none of the banned filler (`utilize`, `facilitate`, `ensure`, `robust`, `comprehensive`, `simply`, and the six carve-out words).
- Tests: bug fixes have regression tests; business logic has edge-case tests (transformations, validation, conditional rendering, state machines, parsing/formatting). For every test you added or changed, name the one-line implementation change it would catch — if you can't, it doesn't count. Anything interactive must be driven with a real event (`user.click` / `user.keyboard`) and assert the resulting DOM/ARIA state, not just initial markup. No Tailwind utility-string assertions, no arbitrary `setTimeout` waits, no `toBeDefined()`/`not.toThrow()` as a test's only assertion, no bare `toHaveBeenCalled()` where the count matters. See [CONVENTIONS.md § Testing](./CONVENTIONS.md#testing).
- TypeScript: no `any`, no forbidden `as Type` assertions, no non-null assertions (`value!`), no `React.FC`; prefer `type` over `interface`.
- Nullish checks: `== null` / `!= null`, not `=== undefined` / `!== undefined`.
- Imports: relative paths in `packages/`, `~/...` aliases in `apps/`; named exports; `import type` for type-only imports.
- className: composed with `cx` from `@ngrok/mantle/cx` — no string interpolation, `+`, or ternaries inside `className`.
- Translation: no conditional element renders immediately before bare text children. A translated text node makes that insert throw, and the page goes blank. Untranslatable content — code, a key, a filename, an ID, a passcode — carries `translate="no"`, locked out of the props type when the element can never hold prose. `pnpm -w run lint` reports all three shapes through `@ngrok/oxlint-plugin`, but it skips the branch it cannot read statically — so read the section rather than trusting a clean run. See [CONVENTIONS.md § Browser Translation](./CONVENTIONS.md#browser-translation).
- Deps: exact-pinned versions (no `^`/`~`); shared deps go through the `catalog:` in `pnpm-workspace.yaml`.

## Setup

From a fresh clone, run `./scripts/setup`. It installs [mise](https://mise.jdx.dev/) (if missing), provisions Node and pnpm at the versions pinned in `.nvmrc` and `package.json#packageManager`, and runs `pnpm install --frozen-lockfile`.

For non-interactive environments without shell activation, prefix workspace commands with `mise x --` (e.g., `mise x -- pnpm -w run build`). Run `mise run doctor` to verify the active toolchain matches committed pins.

## Code Style & Conventions

All rules live in [CONVENTIONS.md](./CONVENTIONS.md) and are mandatory. The `@./CONVENTIONS.md` directive below inlines it automatically for Claude Code; other harnesses should follow the link.

@./CONVENTIONS.md

## Authoring Components

[COMPONENT_SPEC.md](./COMPONENT_SPEC.md) is the single, self-contained standard for building a `@ngrok/mantle` component: the principles behind the library, the artifacts it must ship, what its API, JSDoc, CSS variables, data attributes, docs page and tests must look like, what is never acceptable, how to audit an existing component, and a review checklist to lint a diff against. **Read it before touching `packages/mantle/src/components/`** — it is the only file you need for component work, and the only place these rules are maintained.

`/scaffold-component`, `/audit-component`, and `/promote-preview-component` are workflows that implement it. If a workflow disagrees with the spec, the spec wins — report the mismatch rather than editing the workflow mid-task. Component verification is the five commands in [§9](./COMPONENT_SPEC.md#9-verification), which extend the four below with `pnpm -w run build -F @ngrok/mantle` and require the unscoped test run.

## Project Structure

- **Apps** (`apps/`): `www` (documentation site, React Router 7)
- **Packages** (`packages/`):
  - `mantle` (UI component library, built with tsdown)
  - `mantle-vite-plugins` (Vite + rehype plugins for code-block highlighting and Tailwind CSS source optimization)
  - `mantle-server-syntax-highlighter` (server-side syntax highlighting engine powered by Shiki)
  - `oxlint-plugin` (ngrok's house oxlint rules, shared with `ngrok-private/frontend`)
- **Config** (`config/`): `tsconfig` (shared TypeScript configs via `@cfg/tsconfig`)

```
packages/mantle/src/components/my-component/
├── index.ts              # Re-exports
├── my-component.tsx      # Component implementation
└── my-component.test.tsx # Tests
```

## Commands

All commands run from workspace root, which reuses the turbo cache:

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

Run these from the workspace root once a coherent chunk of work is done and before the final response (see the Agent Contract's verification cadence) — not after every edit. Make sure they pass:

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
- **Type errors**: Build all packages before typechecking
- **Hot reload issues**: Restart dev server or clear `.react-router/` cache
- **Toolchain drift**: Run `mise run doctor` to verify Node and pnpm match committed pins. Re-run `./scripts/setup` if they don't.
- **Lockfile drift** (CI flags `mise.lock` out of sync with `.nvmrc` / `package.json#packageManager`): bump the source pin in `.nvmrc` or `package.json#packageManager`, then `mise run relock && mise install` and commit `mise.lock` alongside the pin change.

## Publishing Changes

```bash
pnpm run changeset              # Create changeset
pnpm run changeset:version      # Update versions
pnpm run changeset:publish      # Build and publish
```
