# Do less in the browser

Do each piece of work at the earliest place that can do it: the build, then the server render, then CSS and the platform, then JavaScript at runtime. Code that does not ship cannot be slow, and it cannot break.

**Why:** Each user pays for runtime JavaScript on each visit: the download, the parse, and the main-thread time that an input then waits for. The browser does CSS and platform work off the main thread or in native code, and the build does its work one time.

**Applies to:** code.

**Signs you missed it:**

- A scroll or resize listener for an effect that a CSS scroll-driven animation, a container query, or `position: sticky` does.
- React state that holds a "mounted" flag for an enter. Use `@starting-style` ([docs/motion.md](../motion.md) rule 9).
- JavaScript that measures an element to set a size that CSS can compute.
- A class that JavaScript toggles for a state that the DOM already carries in `data-state` or an `aria-*` attribute.
- A dependency for a job that an element or a Web API already does.
- Runtime work on a value that the build knows.
- A module side effect on import, which a bundler cannot remove.
- An import that pulls a second component family into a leaf component.
- A hook or `"use client"` in a part that only renders markup. The part adds client work for nothing.

**In this repo:**

- [COMPONENT_SPEC.md §0](../../COMPONENT_SPEC.md#0-principles) items 1 and 10, and [§3.9](../../COMPONENT_SPEC.md#39-performance).
- `CodeBlock` highlights with Shiki at build time, so no highlighter ships to the browser.
- The scroll fade utilities in `mantle.css` are CSS scroll-driven animations with no scroll listener.
- The Tailwind source plugin scans only the components that an app imports.

**Enforced by:** `chart/import-boundary.test.ts`, which fails when a canvas or scatter module comes back into Bar, Line, or Area. Review for the rest.
