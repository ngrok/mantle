# Reuse before you build

Search for an existing helper, hook, part, or dependency before you write a new one. Prefer tested code and the package subpath exports.

**Why:** A second copy drifts from the first, and a bug fixed in one stays in the other. A reader must also learn two names for one idea.

**Applies to:** code.

**Signs you missed it:**

- A local formatter, parser, or class merger beside one that `@ngrok/mantle` already exports.
- A new dependency for a job that the platform or an existing dependency already does.
- A hand-rolled behavior that a mantle part already ships.

**In this repo:** `packages/mantle/src` first, then the owning app. Use `rg` for a name and the [`ast-grep` skill](../../.claude/skills/ast-grep/SKILL.md) for a code shape. Check `pnpm-workspace.yaml` before you add a dependency.

**Enforced by:** review.
