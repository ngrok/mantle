# Fix root causes

Find the cause of a bug and fix it there. Do not add a guard at the place where the symptom shows.

**Why:** A guard at the symptom hides the cause from the next caller, who hits it again without the guard. The fix at the cause protects every caller at once.

**Applies to:** code.

**Signs you missed it:**

- A `try`/`catch` that swallows an error which the code should never throw.
- A `translate="no"` added to stop a translation crash on prose.
- A test that mocks away the failing part instead of fixing it.

**In this repo:** [docs/browser-translation.md](../browser-translation.md) ("the attribute classifies content; it is never the fix for a crash"); [CONVENTIONS.md § Error Handling](../../CONVENTIONS.md#error-handling).

**Enforced by:** review. A bug fix also adds a regression test ([docs/testing.md](../testing.md)).
