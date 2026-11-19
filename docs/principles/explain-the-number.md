# Explain the number

When you state a number (a size, a speed, a count, a percent), say how you got it and what it measures. Never state a number that you did not measure.

**Why:** A number reads as a fact. One with no method cannot be checked, and one that measures the wrong thing misleads the reader who acts on it.

**Applies to:** code, prose.

**Signs you missed it:**

- "Faster" or "smaller" in a changeset with no before and after.
- A bundle size with no build command or no note of minified or gzipped.
- A file size given as proof of a better outcome.
- A timing with no browser, device, CPU throttle, or device pixel ratio.
- One run, when the spread between runs is larger than the change.
- A run of the base and then a run of the branch. A machine drifts between two runs, so run the two in turn and compare each pair.
- A change that ships with a gain inside the spread. If you cannot measure the gain, do not ship the change.
- A "before" that is not `origin/main`, with no word on what it is. Name the base of each comparison.

**In this repo:** changesets ([COMPONENT_SPEC.md §2.5](../../COMPONENT_SPEC.md#25-changesets)), decision docs under `decisions/`, and PR descriptions. For a performance change, measure the base and the branch with the same command on the same machine, and give the command. `pnpm bench` in `apps/www` drives the chart cases of `/bench/charts`.

**Enforced by:** review.
