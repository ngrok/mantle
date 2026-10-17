Read each `AGENTS.md` in the directories from the repo root down to the file you change. Some harnesses load only the root file.

# Mantle Agent Guide

ngrok's UI library and design system: React, TypeScript, Radix, and Tailwind CSS, in a pnpm and Turborepo monorepo. `CLAUDE.md` is a symlink to this file in each directory that has one. Edit `AGENTS.md`, never the symlink.

This file routes you to the rules a task needs. It does not restate them. The files it links to are active instructions, not background reading.

## Route by task

Read the files for your task before the first edit.

- **Any code change:** [CONVENTIONS.md](./CONVENTIONS.md) in full. It holds the code and prose rules for every file.
- **Component source** under `packages/mantle/src/components/`, or its docs page, tests, or wiring: [COMPONENT_SPEC.md](./COMPONENT_SPEC.md), then work its [review checklist](./COMPONENT_SPEC.md#11-review-checklist). Load the `browser-translation-hazards` skill. `/scaffold-component`, `/audit-component`, and `/promote-preview-component` implement the spec.
- **Hooks, utilities, and other public API:** the [Philosophy page](./apps/www/app/docs/philosophy.mdx) for the design rationale. Its JSDoc feeds `llms.txt`, so follow [CONVENTIONS.md § JSDoc](./CONVENTIONS.md#jsdoc).
- **An import in `packages/mantle/src`, or a part that reads router state:** [docs/framework-boundary.md](./docs/framework-boundary.md).
- **JSX that renders text beside an element:** [docs/browser-translation.md](./docs/browser-translation.md).
- **Tests:** [docs/testing.md](./docs/testing.md).
- **Docs site and recipes** under `apps/www`: [COMPONENT_SPEC.md §7](./COMPONENT_SPEC.md#7-the-docs-page) and the `ngrok-style` skill. The recipe-fence tests pin each recipe file.
- **Changesets and releases:** [VERSIONING.md](./VERSIONING.md) decides the bump. Mantle is `0.x`: a breaking change is a `minor`, an additive change is a `patch`, and `major` is never correct. Never correct a bump that a maintainer set by hand.
- **Breaking changes and migrations:** the `write-migration` skill. `/scaffold-migration` lays down the guide and the codemod.
- **Renames across many files:** the `ast-grep` skill.
- **Dependencies:** [CONVENTIONS.md § Package Management](./CONVENTIONS.md#package-management) and `pnpm-workspace.yaml`.
- **Comments, JSDoc, changesets, decision docs, commits, and PR descriptions:** the `simplified-technical-english` skill. [CONVENTIONS.md § Writing](./CONVENTIONS.md#writing) is the normative copy.

## Precedence

- On a component question, COMPONENT_SPEC.md governs.
- On a changeset bump, VERSIONING.md governs.
- On all other code and prose, CONVENTIONS.md governs.
- This file governs how you work.

If a workflow or a skill disagrees with the file it implements, the file wins. Report the mismatch; do not edit the workflow mid-task.

## Principles

Each one has a file in [docs/principles/](./docs/principles/README.md). When you change files, name each principle you applied and the decision it changed.

- [Write less code](./docs/principles/write-less-code.md): the smallest change that meets the task.
- [Subtract before you add](./docs/principles/subtract-before-you-add.md): remove a cause before you guard it.
- [Reuse before you build](./docs/principles/reuse-before-you-build.md): search for the helper, hook, or part first.
- [Minimize reader load](./docs/principles/minimize-reader-load.md): code and prose that read in one pass.
- [Experience first](./docs/principles/experience-first.md): judge a change at the call site and in the changelog.
- [Make illegal states unrepresentable](./docs/principles/make-illegal-states-unrepresentable.md): contracts in types.
- [Pure core, effects at the edges](./docs/principles/pure-core-effects-at-the-edges.md): pure functions, thin bindings.
- [Derive, don't sync](./docs/principles/derive-dont-sync.md): compute values; do not copy them into state.
- [Validate at the boundary](./docs/principles/validate-at-the-boundary.md): parse input once, where it enters.
- [Migrate callers, then delete](./docs/principles/migrate-callers-then-delete.md): no two paths for one job.
- [Fix root causes](./docs/principles/fix-root-causes.md): fix the cause, not the symptom.
- [Prove it works](./docs/principles/prove-it-works.md): run the check, and say what you ran.
- [Test behavior, not implementation](./docs/principles/test-behavior-not-implementation.md): assert what a user sees.
- [Explain the number](./docs/principles/explain-the-number.md): say how you measured it.
- [Sequence verifiable units](./docs/principles/sequence-verifiable-units.md): small steps, each checked.
- [Encode lessons in structure](./docs/principles/encode-lessons-in-structure.md): a check beats a doc rule.
- [Guard the context window](./docs/principles/guard-the-context-window.md): load only what the task needs.

## Before you edit

- Search before you create a helper, hook, part, parser, formatter, or dependency. Look in `packages/mantle/src` first, then the owning app.
- Nothing under `packages/mantle/src` imports a router or an app framework.

## Before you finish

You do not need to run checks after each edit. Run them when a coherent chunk of work is done, and again before the final response.

1. Read `git diff --name-only` and `git diff` for your files.
2. Check each file against the docs your task routed you to, and fix the drift.
3. Run `pnpm -w run check:changed` from the repo root, and make it pass. It formats and lints the changed files, checks the agent-doc budgets, then typechecks and tests each package that changed since `origin/main`. Set `CHECK_BASE` for another base.
   - Component work also runs the commands in [COMPONENT_SPEC.md §9](./COMPONENT_SPEC.md#9-verification), with the unscoped `pnpm -w run test`.
   - In Claude Code, a hook lints each file you edit and reports the errors in the same turn. It skips format, typecheck, and tests; `check:changed` runs them.
4. Every published package that the diff touches has a changeset with the bump from VERSIONING.md.
5. End with a `Conventions pass:` note that says what you checked. If you did not run a check, say why.

## Setup and commands

From a fresh clone, run `./scripts/setup`. It installs [mise](https://mise.jdx.dev/), the pinned Node and pnpm, and the dependencies. Without shell activation, prefix a command with `mise x --`. `mise run doctor` checks the toolchain against the pins.

Run every command from the repo root with `pnpm -w run <script>`; the root `package.json` lists the scripts. Scope a package with `-F`, as in `pnpm -w run test -F @ngrok/mantle`.

## Read-only directories

`local/` is gitignored and holds read-only reference clones of related repos. Never edit, build, or commit from it.

## Common issues

- **Build failures:** `pnpm -w run clean`, then `pnpm -w run build`.
- **Type errors:** build all packages before you typecheck.
- **Hot reload:** restart the dev server, or clear `apps/www/.react-router/`.
- **Toolchain drift:** `mise run doctor`; rerun `./scripts/setup` if it fails.
- **Lockfile drift** (`mise.lock` out of sync): change the pin in `.nvmrc` or `package.json#packageManager`, run `mise run relock && mise install`, and commit `mise.lock` with the pin.
