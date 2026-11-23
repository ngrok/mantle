# Follow the platform

Start from the native element and the behavior the browser gives it. Add the least JavaScript that meets a named need, and measure the result against the same UI written by hand on platform primitives.

**Why:** The browser already ships the hard parts: the top layer, focus order, form submission, find-in-page, and the accessibility tree. Each line of JavaScript that copies them costs bytes and input delay, and it can only drift from what the user, the screen reader, and the test tool expect. A consumer knows how a native `<dialog>` or radio acts, so a part that acts the same way needs no explanation.

**Applies to:** code.

**Signs you missed it:**

- A part that rebuilds in JavaScript what an element or a Web API does: a focus loop, a scroll lock, a hit test, or a positioned box that the top layer gives for free.
- A default that the native element does not have, such as a menu or a picker that blocks the page.
- A departure from browser behavior with no primary source (WHATWG, APG, WCAG), or with a source that says less than the claim.
- A merged rewrite whose open, input, or byte cost is far above the hand-written floor, and no one has said what fills the gap.
- A test that needs `force`, or knowledge of mantle's markup, to act on a part that enhances a native element.
- A virtualized collection, where find-in-page and the server HTML lose the rows.

**In this repo:**

- [COMPONENT_SPEC.md §0](../../COMPONENT_SPEC.md#0-principles) items 1 and 2, [§1.10](../../COMPONENT_SPEC.md#110-follow-the-browser), [§3.6](../../COMPONENT_SPEC.md#36-accessibility-and-motion), and [§3.9](../../COMPONENT_SPEC.md#39-performance).
- `Dialog`, `AlertDialog`, and `Sheet` are a native `<dialog>`. `Popover`, `DropdownMenu`, `Tooltip`, and `HoverCard` are a native `popover`. `RadioGroup` is native radios.
- Menus, popovers, and pickers leave the page live. Only the dialog family is modal by default.

**Enforced by:** the bundle budget (`packages/mantle/bundle-budget.json`) for bytes, the three-engine browser suite, and review.
