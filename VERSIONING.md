# Versioning

How this monorepo picks a changeset bump. This file is the single source of truth, and it outranks any habit
carried in from another repo.

**Read this before you write a changeset.** Stock semver instincts are wrong here, and an agent that applies
them produces a bump a maintainer has to correct by hand.

## The rule in one line

`@ngrok/mantle` is `0.x`, so **there is no major**. Breaking changes ride a `minor`, and everything additive or
internal is a `patch`.

## Why 0.x changes the answer

Semver reserves the major for a break, but a `0.x` package has no major to spend: `0.84.0` and `0.83.1` both
say "pre-1.0" to a consumer's range. The repo therefore uses the two bumps it has to carry a different signal:

- **`minor` means "read the notes before you upgrade."** Existing code may stop compiling or stop behaving.
- **`patch` means "take it."** Existing code keeps working.

Measured against the whole history: 392 patches, 93 minors, and **zero majors, ever**.

## Pick the bump

Start at `patch`. Move to `minor` only when a row below says so.

### `minor` — existing API breaks, disappears, or a whole component arrives

| Change                                            | Example from history                                     |
| ------------------------------------------------- | -------------------------------------------------------- |
| Remove an export                                  | `Checkbox: remove zodCheckbox export`                    |
| Rename an export                                  | `Rename InlineCode to Code`                              |
| Rename a prop, or make an optional prop required  | `priority` → `intent`, required `appearance` + `intent`  |
| Drop a peer dependency or a runtime               | `drop React 18 support, migrate to React 19 ref-as-prop` |
| Change behavior in a way that breaks existing use | Removing `AutoScrollToHash` and its `react-router` peer  |
| A **new top-level component**                     | `Avatar`, `Sidebar`, `Empty`, `QrCode`, `OTPInput`       |
| Promote a preview component to stable             | `promote Tooltip component out of preview`               |

A new top-level component is the one additive change that takes a `minor`. It is a new entry point, a new
docs page, and a new subpath export, so consumers want it called out. Everything else additive is a `patch`.

### `patch` — everything else

| Change                                                    | Example from history                             |
| --------------------------------------------------------- | ------------------------------------------------ |
| Bug fix, behavior fix, security fix                       | `fix(breadcrumb): mute current page text`        |
| **A new prop on a shipped component**                     | `add appearance to Dialog.Content`, `seriesSlot` |
| **A new sub-component or part in a shipped namespace**    | `Empty.Scrim`                                    |
| A new data attribute, `data-slot`, or CSS variable        | `main-joins-data-slot`                           |
| Visual or styling change that keeps the API               | `recess decorative charts`                       |
| Dependency bump                                           | `bump @ariakit/react from 0.4.34 to 0.4.35`      |
| JSDoc, comment, or docs-page prose that ships in the type | `ste-prose-sweep`, `audit-component-sweep`       |
| Emit or build fix                                         | `publish the per-part JSDoc in the built types`  |
| Teaching a Vite plugin about a new component              | `vite-plugins-know-sandbar`                      |

Additive is a `patch` even when the PR title says `feat`. The commit prefix describes the work; the bump
describes what a consumer has to do about it, and the answer for an additive change is nothing.

## Which packages get a changeset

Only the three published packages:

- `@ngrok/mantle`
- `@ngrok/mantle-vite-plugins`
- `@ngrok/mantle-server-syntax-highlighter`

`@app/*` and `@cfg/*` are private and sit in the `ignore` list in `.changeset/config.json`. A docs-site-only
change needs no changeset at all. When one PR touches two published packages, write one changeset per
package — a component that a Vite plugin must also know about takes two.

## How many changesets

One per logical change, not one per PR. A PR that fixes three separate defects ships three changesets, and
each becomes its own changelog bullet for the consumer who only cares about one of them. Four in a single
chart PR is normal.

Name the file for the change in kebab-case — `chart-series-slot.md`, `mute-breadcrumb-page.md`. Do not keep
the three-word name `pnpm -w run changeset` generates.

## What goes in the body

[CONVENTIONS.md § Changesets](./CONVENTIONS.md#changesets-decision-docs-and-docs-pages) owns the prose rules,
and [COMPONENT_SPEC.md §2.5](./COMPONENT_SPEC.md#25-changesets) owns what a component's changeset must cover.
In short: it is release notes for a consumer who will never read the diff, the word bans hold, and the length
limits do not.

A `minor` also states the migration. Name the old spelling, name the new one, and say what a call site has to
change.

## When the bump is genuinely unclear

Ask the maintainer, or pick `patch` and say so in the PR. Do not open a debate in the PR description, and do
not "correct" a bump a maintainer has already set — this file is their decision, written down.
