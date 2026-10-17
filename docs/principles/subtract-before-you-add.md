# Subtract before you add

Before you add a rule, a layer, or a part, look for one to remove. A change that deletes the cause of a problem beats a change that adds a guard around it.

**Why:** Additions stack up, and each one must justify its place every time someone reads it. A rule that nobody follows is a bug in the rule.

**Applies to:** code, prose.

**Signs you missed it:**

- A new flag that turns off behavior a removal would end.
- A doc rule added beside an older rule that says the same thing.
- A wrapper whose only job is to work around another wrapper.

**In this repo:** [CONVENTIONS.md § Abstractions & Duplication](../../CONVENTIONS.md#abstractions--duplication) ("every layer of indirection must continuously justify its existence"); [COMPONENT_SPEC.md § Scope and status](../../COMPONENT_SPEC.md#scope-and-status).

**Enforced by:** review.
