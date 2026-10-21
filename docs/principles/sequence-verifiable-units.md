# Sequence verifiable units

Split work into steps that each end in a state you can check. Finish and verify one step before you start the next.

**Why:** A small verified step localizes a failure to one change. A large unverified batch makes each failure a search through everything.

**Applies to:** code.

**Signs you missed it:**

- A PR that mixes a rename, a behavior change, and a reformat.
- A first test run after twenty edits.
- A commit that does not build on its own.

**In this repo:** [AGENTS.md § Before you finish](../../AGENTS.md#before-you-finish) sets when to run the checks.

**Enforced by:** review.
