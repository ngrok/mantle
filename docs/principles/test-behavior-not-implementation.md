# Test behavior, not implementation

Assert what a user or a caller sees: text, role, accessible name, ARIA state, a documented data attribute, a return value, a callback's arguments.

**Why:** A test that mirrors the code turns red on each refactor and stays green on a real bug. The team then learns to make the test match instead of reading the failure.

**Applies to:** code.

**Signs you missed it:**

- An exact class string, a child count, or an internal call count.
- A constant asserted against a copy of itself.
- A test with no answer to "what one-line change turns this red?"

**In this repo:** [docs/testing.md](../testing.md).

**Enforced by:** oxlint `vitest/expect-expect` for a test with no assertion; review for the rest.
