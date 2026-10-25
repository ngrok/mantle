# Write less code

Solve the task with the smallest change that meets it. Every line you add is a line someone must read, test, and keep.

**Why:** Code costs more to keep than to write. In a library, each public line is also API that a consumer can depend on, and removing it later is a breaking change.

**Applies to:** code, prose.

**Signs you missed it:**

- A helper, an option, or a mode that only the change itself calls.
- A new export that no docs page, test, or app needs yet.
- A comment or a docs paragraph that restates the code beside it.
- A guard, a retry, or a lock for a race or an attack that nobody can name a concrete failure for.

**In this repo:**

- [CONVENTIONS.md § Abstractions & Duplication](../../CONVENTIONS.md#abstractions--duplication); [COMPONENT_SPEC.md §1.2](../../COMPONENT_SPEC.md#12-ship-the-smallest-public-surface).
- Before you add complexity for an unlikely race or security edge case, give the person who asked for the change the concrete failure, its likelihood, and the cost. Add it only when they agree.

**Enforced by:** review.
