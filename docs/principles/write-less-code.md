# Write less code

Solve the task with the smallest change that meets it. Every line you add is a line someone must read, test, and keep.

**Why:** Code costs more to keep than to write. In a library, each public line is also API that a consumer can depend on, and removing it later is a breaking change.

**Applies to:** code, prose.

**Signs you missed it:**

- A helper, an option, or a mode that only the change itself calls.
- A new export that no docs page, test, or app needs yet.
- A comment or a docs paragraph that restates the code beside it.

**In this repo:** [CONVENTIONS.md § Abstractions & Duplication](../../CONVENTIONS.md#abstractions--duplication); [COMPONENT_SPEC.md §1.2](../../COMPONENT_SPEC.md#12-ship-the-smallest-public-surface).

**Enforced by:** review.
