---
description: "Verify a changeset exists for the current branch's changes when packages/mantle source was modified, and validate its bump type."
---

# Check changeset

Verify the current branch has an appropriate changeset whenever it modifies `packages/mantle/` source. Run this before opening a PR.

## 1. Enumerate changed files

```bash
git fetch origin main
git diff main...HEAD --name-only
```

Capture the list. If empty, the branch has no changes — exit cleanly.

## 2. Decide whether a changeset is required

A changeset is **required** when any changed file matches `packages/mantle/src/**` or `packages/mantle/package.json`.

A changeset is **NOT required** when only files under `apps/www/`, `.changeset/`, `.claude/`, root configs, or other unpublished workspaces changed. (When in doubt, prefer adding a patch changeset over none.)

## 3. List existing changesets

```bash
ls .changeset/*.md 2>/dev/null
```

Filter out `README.md` and `config.json` (the changeset config). Each remaining file is a candidate. Read each. Their frontmatter is YAML between two `---` markers and looks like:

```yaml
---
"@ngrok/mantle": patch
---
short description
```

## 4. Validate

- If a changeset is required AND no candidate changeset names `@ngrok/mantle`: **FAIL**. Recommend running `pnpm -w run changeset` and proposing a bump type:
  Read [VERSIONING.md](../../VERSIONING.md) and apply it. Do not apply stock semver — mantle is `0.x`, there is
  no `major`, and additive changes are a `patch`:
  - `patch` for a bug fix, a new prop, a new part in a shipped namespace, a new data attribute or CSS variable,
    a styling change, a dependency bump, or a JSDoc-only edit
  - `minor` only when existing API breaks or disappears (a removed or renamed export, a renamed or
    newly-required prop, a dropped peer), or when a new top-level component ships, or on a preview → stable
    promotion
  - `major` is never correct. Nothing in this repo has ever used it.
- If a changeset exists but uses a bump type that VERSIONING.md does not support, warn but do not fail. Never
  "correct" a bump a maintainer set by hand.
- If a changeset is NOT required and one exists for `@ngrok/mantle`: warn that it may be unnecessary, but don't fail.

## 5. Report

Print:

- Whether a changeset is required (and why).
- The list of existing changesets affecting `@ngrok/mantle` with their bump types and descriptions.
- A clear PASS / FAIL summary.

Exit non-zero on FAIL.
