# Fall into the pit of success

Make the right path the one that takes the least effort. The default is the right choice, the right part is the first one a search finds, and the wrong path meets friction.

**Why:** People and agents take the path that asks the least of them, and they choose by convenience more than by intent. If the wrong path is the easy one, a rule in a doc does not stop it. Rico Mariani named this the pit of success when he worked on .NET at Microsoft ([Brad Abrams, 2003](https://learn.microsoft.com/en-us/archive/blogs/brada/the-pit-of-success)). Jeff Atwood made the phrase known in ["Falling Into The Pit of Success"](https://blog.codinghorror.com/falling-into-the-pit-of-success/) (2007): "a well-designed system makes it easy to do the right things and annoying (but not impossible) to do the wrong things." If users do not find success on their own, the cause is the design, not the users.

**Applies to:** code, prose. Each audience is in scope: a person at the call site and an agent that reads the docs or the MCP.

**How:**

- **The default is right.** A consumer who sets no prop gets the correct and accessible result ([build the behavior in](./build-the-behavior-in.md)).
- **The right part is the easiest to find.** The docs page, the JSDoc example, the MCP skill, and `find` with its aliases all lead to it before a near miss.
- **The wrong path meets friction.** A type cannot express it ([make illegal states unrepresentable](./make-illegal-states-unrepresentable.md)). A wrong use at runtime throws a dev error that names the fix. A recurring mistake gets a lint rule ([encode lessons in structure](./encode-lessons-in-structure.md)).
- **The friction is small.** A wrong path is hard, not impossible. An escape hatch such as `asChild` or `className` stays, so nobody forks a part to get around it.

**Signs you missed it:**

- A correct use that needs a prop, a wrapper, or a step that each app must remember.
- A query for a need that `find` answers with a near miss or a hand-rolled recipe.
- A docs example that teaches a workaround, so callers copy it.
- A misuse that compiles, renders, and fails with no error.
- A rule that only prose states, after the same mistake shows up in review again.

**In this repo:** [north star](../north-star.md); [COMPONENT_SPEC.md §0](../../COMPONENT_SPEC.md#0-principles) items 5, 11, and 12; [§3.5](../../COMPONENT_SPEC.md#35-errors-and-invariants); the MCP `find` golden queries ([docs/mcp-evals.md](../mcp-evals.md)); the `mantle/*` rules in `.oxlintrc.json`.

**Enforced by:** `pnpm -w run typecheck`, `pnpm -w run lint`, the `find` golden queries, and review.
