Read each `AGENTS.md` in the directories from the repo root down to the file you change. Some harnesses load only the root file.

# Mantle Agent Guide

ngrok's UI library and design system: React, TypeScript, Radix, and Tailwind CSS, in a pnpm and Turborepo monorepo.

This file follows the [AGENTS.md standard](https://agents.md) and is canonical for every harness. It routes you to the rules a task needs, and the files it links to are active instructions. `CLAUDE.md` is a symlink to it in each directory that has one; edit `AGENTS.md` only.

## Route by task

Read the files for your task before the first edit. Work is incomplete until you check your diff against them.

- **Any code change:** [CONVENTIONS.md](./CONVENTIONS.md) in full. It holds the code and prose rules for every file.
- **Component source** under `packages/mantle/src/components/`, or its docs page, tests, or wiring: [COMPONENT_SPEC.md](./COMPONENT_SPEC.md), then work its [review checklist](./COMPONENT_SPEC.md#11-review-checklist). Load the `browser-translation-hazards` skill. `/scaffold-component`, `/audit-component`, and `/promote-preview-component` implement the spec.
- **Hooks, utilities, and other public API:** the [Philosophy page](./apps/www/app/docs/philosophy.mdx) for the design rationale. Its JSDoc feeds `llms.txt`, so follow [CONVENTIONS.md § JSDoc](./CONVENTIONS.md#jsdoc).
- **An import in `packages/mantle/src`, or a part that reads router state:** [docs/framework-boundary.md](./docs/framework-boundary.md).
- **JSX that renders text beside an element:** [docs/browser-translation.md](./docs/browser-translation.md).
- **Any animation or transition:** [docs/motion.md](./docs/motion.md). Load the `motion` skill.
- **Tests:** [docs/testing.md](./docs/testing.md).
- **Docs site and recipes** under `apps/www`: [COMPONENT_SPEC.md §7](./COMPONENT_SPEC.md#7-the-docs-page) and the `ngrok-style` skill. The recipe-fence tests pin each recipe file.
- **Changesets and releases:** [VERSIONING.md](./VERSIONING.md) decides the bump. Mantle is `0.x`: a breaking change is a `minor`, an additive change is a `patch`, and `major` is never correct. Never correct a bump that a maintainer set by hand.
- **Breaking changes and migrations:** the `write-migration` skill. `/scaffold-migration` lays down the guide and the codemod.
- **Renames across many files:** the `ast-grep` skill.
- **Dependencies:** [CONVENTIONS.md § Package Management](./CONVENTIONS.md#package-management) and `pnpm-workspace.yaml`.
- **A change a person sees** (a component, a docs page, a recipe): before you report done, follow [docs/browser-checks.md](./docs/browser-checks.md).
- **Comments, JSDoc, changesets, decision docs, commits, and PR descriptions:** the `simplified-technical-english` skill. [CONVENTIONS.md § Writing](./CONVENTIONS.md#writing) is the normative copy.

## Precedence

COMPONENT_SPEC.md governs a component question, VERSIONING.md a changeset bump, and CONVENTIONS.md all other code and prose. This file governs how you work.

If a workflow or a skill disagrees with the file it implements, the file wins. Report the mismatch; do not edit the workflow mid-task.

## Principles

Each one has a file in [docs/principles/](./docs/principles/README.md). When you change files, name each principle you applied and the decision it changed.

- [Write less code](./docs/principles/write-less-code.md) (code, prose): the smallest change that meets the task.
- [Subtract before you add](./docs/principles/subtract-before-you-add.md) (code, prose): remove a cause before you guard it.
- [Reuse before you build](./docs/principles/reuse-before-you-build.md) (code): search for the helper, hook, or part first.
- [Minimize reader load](./docs/principles/minimize-reader-load.md) (code, prose): code and prose that read in one pass.
- [Experience first](./docs/principles/experience-first.md) (code, prose): judge a change at the call site and in the changelog.
- [Make illegal states unrepresentable](./docs/principles/make-illegal-states-unrepresentable.md) (code): contracts in types.
- [Pure core, effects at the edges](./docs/principles/pure-core-effects-at-the-edges.md) (code): pure functions, thin bindings.
- [Derive, don't sync](./docs/principles/derive-dont-sync.md) (code): compute values; do not copy them into state.
- [Validate at the boundary](./docs/principles/validate-at-the-boundary.md) (code): parse input once, where it enters.
- [Migrate callers, then delete](./docs/principles/migrate-callers-then-delete.md) (code): no two paths for one job.
- [Fix root causes](./docs/principles/fix-root-causes.md) (code): fix the cause, not the symptom.
- [Prove it works](./docs/principles/prove-it-works.md) (code, prose): run the check, and say what you ran.
- [Test behavior, not implementation](./docs/principles/test-behavior-not-implementation.md) (code): assert what a user sees.
- [Explain the number](./docs/principles/explain-the-number.md) (code, prose): say how you measured it.
- [Sequence verifiable units](./docs/principles/sequence-verifiable-units.md) (code): small steps, each checked.
- [Encode lessons in structure](./docs/principles/encode-lessons-in-structure.md) (code, prose): a check beats a doc rule.
- [Guard the context window](./docs/principles/guard-the-context-window.md) (code, prose): load only what the task needs.

## Before you edit

- Search before you create a helper, hook, part, parser, formatter, or dependency. Look in `packages/mantle/src` first, then the owning app.
- Other sessions can work in the same checkout. Run `git status` before you stage, and stage by path. Never `git add -A`.
- Do not revert a working-tree change you did not make. Ask first.
- `local/` holds read-only reference clones of related repos. Never edit, build, or commit from it.

## Before you finish

Run checks when a coherent chunk of work is done and again before the final response, not after each edit.

1. Read `git diff --name-only` and `git diff` for your files.
2. Check each file against the docs your task routed you to, and fix the drift.
3. Run `pnpm -w run check:changed` from the repo root, and make it pass. It covers format, lint, agent-doc budgets, typecheck, and tests for each package changed since `origin/main` (`CHECK_BASE` sets another base).
   - Component work also runs the commands in [COMPONENT_SPEC.md §9](./COMPONENT_SPEC.md#9-verification), with the unscoped `pnpm -w run test`.
4. Every published package that the diff touches has a changeset with the bump from VERSIONING.md.
5. End with a `Conventions pass:` note that says what you checked. If you did not run a check, say why.

## Setup and commands

From a fresh clone, run `./scripts/setup`. It installs mise, the pinned Node and pnpm, and the dependencies. Without shell activation, prefix a command with `mise x --`.

Run commands from the repo root with `pnpm -w run <script>` (the root `package.json` lists them). Agents get these wrong:

```sh
pnpm -w run start -F @app/www     # the docs site dev server
pnpm -w run test -F @ngrok/mantle # one package
```

- Keep `run` in a workspace command. A `-F` after the script name is turbo's filter. pnpm parses `pnpm -w start -F` itself and also runs the unfiltered root script.
- Do not pipe a check through `tail` or `head`. The pipe returns the exit code of the last command, so a failed check looks green. Set `pipefail` or redirect to a file instead.

## Common issues

- **Build failures:** `pnpm -w run clean`, then `pnpm -w run build`.
- **Type errors:** build all packages before you typecheck.
- **Hot reload:** restart the dev server, or clear `apps/www/.react-router/`.
- **Toolchain drift:** `mise run doctor`; rerun `./scripts/setup` if it fails.
- **Lockfile drift** (`mise.lock` out of sync): change the pin in `.nvmrc` or `package.json#packageManager`, run `mise run relock && mise install`, and commit `mise.lock` with the pin.
