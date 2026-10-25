# Prove it works

Before you report a change as done, run the checks that would catch it if it were wrong, and say what you ran. A claim with no check is a guess.

**Why:** A reviewer cannot rerun your session. The check output is the only evidence that the change does what you say.

**Applies to:** code, prose.

**Signs you missed it:**

- "Should work" or "this fixes it" with no command output.
- A scoped test run where the task needs the full run.
- A docs example that nobody rendered.
- "Done" for a component, a docs page, or an interaction that nobody opened in a browser.

**In this repo:**

- [AGENTS.md § Before you finish](../../AGENTS.md#before-you-finish); [COMPONENT_SPEC.md §9](../../COMPONENT_SPEC.md#9-verification).
- Look at every change a person sees in a browser, at phone and desktop widths, in light and dark themes ([docs/browser-checks.md](../browser-checks.md)).

**Enforced by:** the Vibe Check CI workflow for tests and builds. Visual checks need a person or a browser tool.
