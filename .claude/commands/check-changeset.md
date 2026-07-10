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
  - `patch` for doc/JSDoc/comment-only changes (no public API impact)
  - `minor` for new exports, new components, new behavior
  - `major` for breaking changes (removed exports, renamed APIs, behavior changes that break existing usage)
- If a changeset exists but uses a bump type that seems wrong for the diff (e.g., `patch` while a new export is being added), warn but do not fail.
- If a changeset is NOT required and one exists for `@ngrok/mantle`: warn that it may be unnecessary, but don't fail.

## 5. Report

Print:

- Whether a changeset is required (and why).
- The list of existing changesets affecting `@ngrok/mantle` with their bump types and descriptions.
- A clear PASS / FAIL summary.

Exit non-zero on FAIL.
