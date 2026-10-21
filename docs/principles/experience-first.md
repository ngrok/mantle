# Experience first

Judge a change by what the person on the other side gets: the consumer at the call site, the user on the page, and the reader of the changelog.

**Why:** Mantle's value is the work that its consumers do not have to do. An API that is easy to implement and hard to call moves that work back to every app.

**Applies to:** code, prose.

**Signs you missed it:**

- A call site that needs a comment to make sense.
- A default that is safe for mantle and wrong for the common app.
- A changeset that describes the diff and not what changes for the consumer.
- A part that renders wrong for one frame before it hydrates.

**In this repo:** [COMPONENT_SPEC.md §0](../../COMPONENT_SPEC.md#0-principles) items 7, 8, 11, and 14; [§2.5](../../COMPONENT_SPEC.md#25-changesets).

**Enforced by:** review.
