# Guard the context window

Load only what the task needs, and keep each always-loaded file small. Link to a rule; do not copy it into the router.

**Why:** Every byte that an agent loads before the first edit competes with the task. Some harnesses also cut long files, so a large ruleset loses rules with no sign.

**Applies to:** code, prose.

**Signs you missed it:**

- A rule copied into `AGENTS.md` that another file owns.
- A fact that a command can answer, such as a version, a port, or a package list.
- An always-loaded table that the formatter pads.

**In this repo:** [AGENTS.md § Route by task](../../AGENTS.md#route-by-task).

**Enforced by:** `pnpm -w run check:agent-docs`, which fails when an agent doc passes its byte budget.
