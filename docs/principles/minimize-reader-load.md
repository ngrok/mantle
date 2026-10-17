# Minimize reader load

Write code and prose that a reader understands in one pass. Choose plain names, early returns, short sentences, and one idea for each unit.

**Why:** Code is read far more often than it is written. Every clever line costs each later reader the time it saved the writer.

**Applies to:** code, prose.

**Signs you missed it:**

- A nested ternary, or a boolean positional argument.
- A single-letter name for anything that lives past one line.
- A comment that explains confusing code instead of a rename that removes the confusion.
- A sentence with two independent ideas, or a condition at its end.

**In this repo:** [CONVENTIONS.md § Readability & Maintainability](../../CONVENTIONS.md#readability--maintainability) and [§ Writing](../../CONVENTIONS.md#writing).

**Enforced by:** oxfmt and oxlint for the mechanical part; review for the rest.
