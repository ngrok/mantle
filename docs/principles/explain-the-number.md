# Explain the number

When you state a number (a size, a speed, a count, a percent), say how you got it and what it measures. Never state a number that you did not measure.

**Why:** A number reads as a fact. One with no method cannot be checked, and one that measures the wrong thing misleads the reader who acts on it.

**Applies to:** code, prose.

**Signs you missed it:**

- "Faster" or "smaller" in a changeset with no before and after.
- A bundle size with no build command or no note of minified or gzipped.
- A file size given as proof of a better outcome.

**In this repo:** changesets ([COMPONENT_SPEC.md §2.5](../../COMPONENT_SPEC.md#25-changesets)), decision docs under `decisions/`, and PR descriptions.

**Enforced by:** review.
