# Redesign before you cache

Make the slow path fast before you add a cache. Add a cache only when a benchmark shows that it beats the best design with no cache. Then give it a size limit, and derive its key from each input of the result.

**Why:** A cache does work of its own: it computes a key, finds the entry, and holds memory for the life of the page. That work can cost more than a design that is fast with no cache. A stale entry paints the wrong UI: a size from before a resize, or a color from the other theme. So a cache is a risk to correctness, not only a speedup.

**Applies to:** code. A cache is each value that code keeps to skip work later: a module-level `Map`, a ref that holds a measurement, a memo, and state that copies a prop.

**Signs you missed it:**

- A `Map` or a module-level value that grows with each page or each item, with no size limit.
- A DOM measurement that code keeps with nothing to clear it on a resize, a font load, or a theme change.
- A key that does not hold each input of the result, such as the theme, the locale, or the device pixel ratio.
- State that copies a prop or a computed value. See [derive, don't sync](./derive-dont-sync.md).
- A `memo` around a child to hide a parent that renders too often. Fix the parent.
- A cache with no benchmark of the same path with no cache.

**In this repo:**

- `cx` keeps merge results by argument sequence in V8 only, because the other engines hash a new string cheaply. The cache has two generations and a size limit for each one (`utils/cx/cx.ts`).
- `useBreakpoint` keeps one `subscribe` function for each breakpoint, so the key space is the fixed list of breakpoints.

**Enforced by:** review.
