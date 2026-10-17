# Pure core, effects at the edges

Write data transforms, parsing, formatting, and state derivation as small pure functions. Keep I/O, framework state, and the DOM in the callers.

**Why:** A pure function gives the same output for the same input. A test calls it with a value, with no render, no mock, and no timer.

**Applies to:** code.

**Signs you missed it:**

- A transform that a test reaches only through a full render.
- A function that reads `Date.now()` or `window` instead of taking the value as an argument.
- A hook that holds logic which does not use React.

**In this repo:** [COMPONENT_SPEC.md §0](../../COMPONENT_SPEC.md#0-principles) item 6, "Pure cores, thin bindings"; [CONVENTIONS.md § State & Business Logic](../../CONVENTIONS.md#state--business-logic).

**Enforced by:** review.
