# Migrate callers, then delete

When you replace an API, move every caller to the new one, then remove the old one. Do not leave two paths that do the same job.

**Why:** A kept old path is a second API to document, test, and fix. Callers keep choosing it, so it never goes away.

**Applies to:** code.

**Signs you missed it:**

- A `@deprecated` export that the repo itself still calls.
- An adapter that maps the old shape to the new one with no removal planned.
- A breaking change with no migration guide or codemod.

**In this repo:** the [`write-migration` skill](../../.claude/skills/write-migration/SKILL.md) and [VERSIONING.md](../../VERSIONING.md). The [`ast-grep` skill](../../.claude/skills/ast-grep/SKILL.md) moves many callers in one rewrite.

**Enforced by:** `pnpm -w run test:scripts`, which pins each migration guide to its codemod.
