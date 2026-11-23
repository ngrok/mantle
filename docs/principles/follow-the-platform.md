# Follow the platform

Start from the native element and the behavior the browser gives it. Add the least JavaScript that meets a named need, and measure the result against the same UI written by hand on platform primitives.

**Why:** The browser already ships the hard parts: the top layer, focus order, form submission, find-in-page, and the accessibility tree. JavaScript that copies them costs bytes and input delay. It can also drift from what the user, the screen reader, and the test tool expect. A consumer knows how a native `<dialog>` or radio acts, so a part that acts the same way needs no explanation.

**Applies to:** code.

**Signs you missed it:**

- A part that rebuilds in JavaScript what an element or a Web API does: the stacking of the top layer, `inert` behind a modal, a focus loop, or a hit test.
- A default that the native element does not have, such as a menu or a picker that blocks the page.
- A departure from browser behavior with no primary source, or with a source that says less than the claim ([COMPONENT_SPEC.md §1.10](../../COMPONENT_SPEC.md#110-follow-the-browser)).
- A merged rewrite whose open, input, or byte cost is far above the hand-written floor, and no one has said what fills the gap.
- A test that needs `force`, or knowledge of mantle's markup, to act on a part that enhances a native element.
- A virtualized collection, where find-in-page and the server HTML lose the rows.

**In this repo:**

- [COMPONENT_SPEC.md §0](../../COMPONENT_SPEC.md#0-principles) item 1 lists which parts are native elements. [§1.10](../../COMPONENT_SPEC.md#110-follow-the-browser) holds the browser defaults, [§3.6](../../COMPONENT_SPEC.md#36-accessibility-and-motion) the role-query contract, and [§3.9](../../COMPONENT_SPEC.md#39-performance) the native floor.

**Enforced by:** the bundle budget (`packages/mantle/bundle-budget.json`) for bytes, the three-engine browser suite, and review.
