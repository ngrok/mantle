# Validate at the boundary

Parse untrusted input once, where it enters: props from a consumer, a URL, storage, or a network response. Inside the boundary, trust the parsed type.

**Why:** A check at the entry gives one clear failure. Checks spread through the code repeat the work, miss a path, and let a bad value travel far before it fails.

**Applies to:** code.

**Signs you missed it:**

- The same `typeof` or `== null` guard in several functions that receive one value.
- A cast on data that came from `localStorage`, a query string, or `JSON.parse`.
- A deep function that throws on input that its caller could have rejected.

**In this repo:** [CONVENTIONS.md § Error Handling](../../CONVENTIONS.md#error-handling) ("fail fast when invariants are violated"); [COMPONENT_SPEC.md §3.5](../../COMPONENT_SPEC.md#35-errors-and-invariants).

**Enforced by:** review.
