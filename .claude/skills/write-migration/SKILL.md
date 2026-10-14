---
name: write-migration
description: "Write a mantle migration guide and the ast-grep codemod that ships with it. Use WHENEVER a change takes a breaking minor bump (a removed or renamed export, a renamed or newly required prop, a behavior change that breaks existing use), when you add or edit a page under apps/www/app/docs/migrations, or when you add or edit rules under packages/mantle/migrations. Skip it for a new component or a preview promotion: those minors need no guide."
---

# Write a migration

A breaking `minor` ships three things together: the change, a guide under `apps/www/app/docs/migrations/`,
and a codemod under `packages/mantle/migrations/`. The guide tells an agent what to change. The codemod does
the syntactic part of it, so a consumer migrates with one command instead of a hand edit across a hundred
files. `/scaffold-migration` lays the files down in order; this file holds the rules the files must meet.

[VERSIONING.md](../../../VERSIONING.md) decides that a change is a breaking `minor`.
[CONVENTIONS.md § Writing](../../../CONVENTIONS.md#writing) governs every sentence in the guide.

## The deliverable

| Artifact                                                           | Required                                                                                   |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| `apps/www/app/docs/migrations/<NNNN>-<slug>-migration.mdx`         | Always. The sections below, in order.                                                      |
| `packages/mantle/migrations/<NNNN>-<slug>/rules.yml`               | Always, unless every step is semantic (see [What stays manual](#what-stays-manual)).       |
| `packages/mantle/migrations/<NNNN>-<slug>/before.tsx`              | With the rules. One case per rule, plus one negative case per guard.                       |
| `packages/mantle/migrations/<NNNN>-<slug>/after.tsx`               | With the rules. The real output of the rules on `before.tsx`, then formatted with oxfmt.   |
| `migrations` entry in `apps/www/app/components/navigation-data.ts` | Always. Number, slug, title, description, route.                                           |
| `migrationsPages` entry in `apps/www/app/routes.ts`                | Always.                                                                                    |
| A `minor` changeset that links the guide                           | Always. The changeset names `https://mantle.ngrok.com/migrations/<NNNN>-<slug>-migration`. |

`pnpm -w run test:scripts` pins the pair: every guide carries a `## Codemod` section that names
`pnpm -w run migrate <NNNN>` or says `manual:` with a reason, every rules directory has a guide and both
fixtures, every codemod rewrites `before.tsx` into `after.tsx`, and every `minor` changeset links a guide or
says `No migration:` with a reason.

## Numbering

A guide keeps its number forever, and no later guide takes it. The next number is one more than the last entry
in `migrations` in `navigation-data.ts`, zero-padded to four digits. The doc slug ends in `-migration`
(`0008-tabs-separator-migration`); the rules directory drops that suffix (`0008-tabs-separator`).

## The guide, section by section

The reader is an agent in a consumer repo with the diff out of reach. Write for that reader. Model the whole
file on [0008](../../../apps/www/app/docs/migrations/0008-tabs-separator-migration.mdx).

1. **Frontmatter.** `title: <Title> Migration` and a one-line `description` that states the change and the
   fix. The description also goes on the `migrations` entry.
2. **`# Mantle <Title> Migration Guide`**, then one paragraph: what changed, what is gone, and what replaces it.
3. **`**TL;DR:**`** One paragraph an agent can act on without reading further.
4. **`## Codemod`.** With rules: the two invocations (from a mantle checkout, `pnpm -w run migrate <NNNN> <path>`;
   in a consumer, `npx ast-grep scan --rule node_modules/@ngrok/mantle/dist/migrations/<NNNN>-<slug>.yml --update-all <path>`),
   which numbered steps the rules apply, which steps stay manual and why, whether the codemod runs once, and
   a reminder to pass `--dry-run` first and run the formatter after. Without rules: one line,
   `Codemod: manual: <reason>.`
5. **`## You are an agent migrating a codebase. Do this:`** Numbered steps. Each names what to search for
   (the part, its aliased and destructured imports), what to change, and what to leave alone. The last step
   runs the formatter, linter, type checker, and tests.
6. **`> **Why <topic>?**`** One blockquote with the design reason. Two to four sentences.
7. **`## Before → after`.** One `### <case>` per shape, each with a `// BEFORE` fence and an `// AFTER` fence.
   Cover the dynamic case and the aliased import when they exist.
8. **`## Edge cases & gotchas`** when there are any, and **`## How to verify`** with the commands and the
   test queries that change.

## The codemod

The rules live in one `rules.yml`, one YAML document per rule, separated by `---`. Each document has `id`,
`language: tsx`, `message`, `rule`, and `fix`. The runner is the root `node_modules/.bin/ast-grep`
(`@ast-grep/cli`); the rule syntax is at https://ast-grep.github.io/guide/rule-config.html. Model a file on
[0009](../../../packages/mantle/migrations/0009-chart-root-mode/rules.yml) for attributes and on
[0008](../../../packages/mantle/migrations/0008-tabs-separator/rules.yml) for an inserted sibling.

- **Match the smallest node that changes.** A prop rename or removal matches a `jsx_attribute` (`fix: ""`
  deletes it). An inserted sibling matches the `jsx_closing_element` and writes it back with the new line.
  An object key rename matches the `pair`; a method call matches the `member_expression`.
- **Scope every rule to the mantle part.** `inside:` an opening or self-closing element whose `name` field
  matches `^Tabs\.List$`. Use `any:` over `jsx_opening_element` and `jsx_self_closing_element`. Add
  `stopBy: end` when the element is not the direct parent.
- **Capture a dynamic value with a pattern.** `pattern: { context: <Root decorative={$FLAG} />, selector: jsx_attribute }`
  binds `$FLAG` for the `fix`.
- **Guard with `not:` so a rule never matches its own output.** The fixture test runs every codemod twice and
  expects the second run to change nothing. When idempotence is impossible (0003 swaps two children, 0008
  cannot tell a migrated list from an unmigrated one), say "run once" in the `## Codemod` section and add the
  number to `oneShotMigrations` in `scripts/migrate.test.ts`, with the reason in that comment.
- **Never match an unrelated library's identifier.** A bare `decorative` or `getState()` without the part
  scope rewrites someone else's code.
- **Iterate on the fixture.** `pnpm -w run migrate <NNNN> --dry-run packages/mantle/migrations/<NNNN>-<slug>/before.tsx`
  prints the rewrites; `pnpm -w run test:scripts` runs the pair. `after.tsx` is what the rules emit, then
  `pnpm -w run fmt`; the test compares whitespace-normalized tokens, so the formatter's layout does not matter.
- **Check real code before you ship.** `pnpm -w run migrate <NNNN> --dry-run local/frontend/apps` writes
  nothing and shows every match in the frontend clone. Report the count in the PR, and read a handful of the
  matches for a false positive.

## What stays manual

A rule rewrites syntax. These are not syntax, so the guide lists them as manual steps under `## Codemod`:

- A class string, a CSS selector, or a test query (`gap-2`, `[data-hide-border]`, `getByRole("application")`).
- Code that moves between modules (a header that leaves the shell for every route).
- A choice the agent makes per call site (which chart is a sparkline, which `id` was load-bearing).
- A swap of one library's API for another's (PrismJS to `CodeBlock`).

When every step is one of these, the guide says `Codemod: manual: <reason>.` and ships no rules directory.
That is the exception. Partial coverage is the normal case: rules for the syntactic steps, a manual list for
the rest.

## Self-check

- The guide has every section above, in order, and the `## Codemod` section names the number the file carries.
- `before.tsx` has a negative case for every guard, and `after.tsx` is the rules' real output.
- The codemod is idempotent, or the guide says "run once" and the test exempts it with a reason.
- A dry run over `local/frontend/apps` found the expected shapes and nothing else.
- The changeset is `minor` and links the guide.
- Every sentence passes [CONVENTIONS.md § Self-check](../../../CONVENTIONS.md#self-check).
