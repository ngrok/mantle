# Derive, don't sync

Compute a value from the state, props, or URL that already hold it. Do not copy it into a second piece of state and keep the two in step.

**Why:** Two copies of one fact disagree for at least one render, and a missed update makes them disagree for good. A derived value cannot drift.

**Applies to:** code.

**Signs you missed it:**

- A `useEffect` whose only job is to call a `set` function from props or other state.
- State that resets by hand when a prop changes.
- A cached count, length, or flag that the source array already gives.

**In this repo:** [CONVENTIONS.md § State & Business Logic](../../CONVENTIONS.md#state--business-logic).

**Enforced by:** review.
