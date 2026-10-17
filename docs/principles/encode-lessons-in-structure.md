# Encode lessons in structure

When a mistake recurs, turn the lesson into a lint rule, a type, a test, or a script. Prose is the fallback, not the fix.

**Why:** A check runs on every change and needs no reader to remember it. A doc rule depends on someone who reads it at the right time.

**Applies to:** code, prose.

**Signs you missed it:**

- The same review comment on three PRs.
- A doc rule that a lint rule or a type could check.
- A gotcha that lives only in one person's notes.

**In this repo:** the framework-boundary `no-restricted-imports` override in `.oxlintrc.json`; the recipe-fence and docs-route drift tests in `apps/www`; `scripts/check-agent-docs.ts`; [COMPONENT_SPEC.md §1.8](../../COMPONENT_SPEC.md#18-write-a-decision-doc-when-the-answer-was-contested) for decisions.

**Enforced by:** the checks it creates.
