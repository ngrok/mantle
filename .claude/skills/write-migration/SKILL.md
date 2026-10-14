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

| Artifact                                                            | Required                                                                                   |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `apps/www/app/docs/migrations/<NNNN>-<slug>-migration.mdx`          | Always. The sections below, in order.                                                      |
| `packages/mantle/migrations/<NNNN>-<slug>/rules.yml`                | Always, unless every step is semantic (see [What stays manual](#what-stays-manual)).       |
| `packages/mantle/migrations/<NNNN>-<slug>/before.tsx`               | With the rules. One case per rule, plus one negative case per guard.                       |
| `packages/mantle/migrations/<NNNN>-<slug>/after.tsx`                | With the rules. The real output of the rules on `before.tsx`, then formatted with oxfmt.   |
| `packages/mantle/migrations/<NNNN>-<slug>/before.ts` and `after.ts` | With a `language: typescript` rule. The same pair for a `.ts` module.                      |
| `migrations` entry in `apps/www/app/components/navigation-data.ts`  | Always. Number, slug, title, description, route.                                           |
| `migrationsPages` entry in `apps/www/app/routes.ts`                 | Always.                                                                                    |
| A `minor` changeset that links the guide                            | Always. The changeset names `https://mantle.ngrok.com/migrations/<NNNN>-<slug>-migration`. |

`pnpm -w run test:scripts` pins the pair: every guide carries a `## Codemod` section that names
`pnpm -w run migrate <NNNN>` and the consumer command with the `@ast-grep/cli` version the root `package.json`
pins, or says `manual:` with a reason, every rules directory has a guide and both
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
   in a consumer, `npx --yes --package=@ast-grep/cli@0.45.3 ast-grep scan --rule node_modules/@ngrok/mantle/dist/migrations/<NNNN>-<slug>.yml --update-all <path>`),
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
`language: tsx`, `message`, `rule`, and `fix`. A rule with no JSX in it (an object key, a method call) ships
a second copy with `language: typescript`, because a rule reaches only its own language. The runner is the
root `node_modules/.bin/ast-grep` (`@ast-grep/cli`), and the consumer command names the same package with
`npx --package`, because the bare `ast-grep` npm name is an unrelated package. The rule syntax is at
https://ast-grep.github.io/guide/rule-config.html. Model a file on
[0009](../../../packages/mantle/migrations/0009-chart-root-mode/rules.yml) for attributes and on
[0008](../../../packages/mantle/migrations/0008-tabs-separator/rules.yml) for an inserted sibling.

- **Match the smallest node that changes.** A prop rename or removal matches a `jsx_attribute` (`fix: ""`
  deletes it). An inserted sibling matches the `jsx_closing_element` and writes it back with the new line.
  An object key rename matches the `pair`; a method call matches the `member_expression`.
- **Scope every rule to the part's import, not its spelling.** A `<part>-import` util binds the local name of
  the part's import from its `@ngrok/mantle/<subpath>` to a metavariable (`$TABS`), and the JSX name matches
  that metavariable, so `MantleTabs.List` matches and another library's `Tabs.List` does not. Model the util
  on [0008](../../../packages/mantle/migrations/0008-tabs-separator/rules.yml). Match the element with `any:`
  over `jsx_opening_element` and `jsx_self_closing_element`, and add `stopBy: end` when the element is not
  the direct parent.
- **Bind the name before the import.** ast-grep evaluates `inside` before `has` in one object, so put the
  name `has` and the import `inside` in an `all:` in that order. A file that imports the part twice (`Tabs,
  Tabs as MantleTabs`) binds the wrong name otherwise.
- **Give every `any` branch, and every `has` or `not`, a positive matcher** (`kind`, `pattern`, or
  `matches`), or the file fails to parse. A util that names an undefined util fails at match time with no
  error, so every rule needs a fixture case.
- **Read a literal through the tree, not the text.** `priority="default"` also reads `priority='default'`,
  `priority = "default"`, and `priority={"default"}`, so match the attribute's own `string` child (or the
  `string` inside its `jsx_expression`) and never a regex over the attribute text. Keep the child search at
  the default `stopBy`, so a `"default"` inside a ternary does not count.
- **Parenthesize a captured expression when the fix wraps it.** `!$CONDITION` and `$FLAG ? a : b` need
  parentheses around a compound capture. Split the rule in two on the capture's `kind` (the formatter strips
  parentheses the simple kinds do not need), as 0008 and 0009 do.
- **Insert a sibling only where one can go.** A list inside `{show && <Tabs.List />}` has no enclosing tag,
  so a second element there breaks the parse. Require the element's parent to be a `jsx_element`, and leave
  the removed prop in place where the rule cannot reach, so the type checker names the call site.
- **Resolve the nearest root.** `inside:` with `stopBy: end` walks past the root that matters. Stop at the
  nearest ancestor of the root's shape (`stopBy: { matches: tabs-root }`) and test that one.
- **Capture a dynamic value with a pattern.** `pattern: { context: <Root decorative={$FLAG} />, selector: jsx_attribute }`
  binds `$FLAG` for the `fix`.
- **Guard with `not:` so a rule never matches its own output.** The fixture test runs every codemod twice and
  expects the second run to change nothing. When idempotence is impossible (0003 swaps two children, 0008
  cannot tell a migrated list from an unmigrated one), say "run once" in the `## Codemod` section and add the
  number to `oneShotMigrations` in `scripts/migrate.test.ts`, with the reason in that comment.
- **Never match an unrelated library's identifier.** A bare `decorative` or `getState()` without the part
  scope rewrites someone else's code.
- **Cover the negative cases in `before.tsx`:** the aliased import, another library's part under the same
  name, a literal in a second spelling, and every shape a guard rejects. `.prettierignore` exempts
  `before.ts*`, so a single-quoted or spaced attribute survives `pnpm -w run fmt`.
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
