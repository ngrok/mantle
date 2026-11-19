# Keep the hot path lean

Do each piece of work one time, at the earliest point that has its input: module scope, then the mount, then the event. Code that runs for each frame, each event, or each item does only the work that depends on that frame, that event, or that item.

**Why:** A frame at 60Hz has about 16ms for script, style, layout, and paint together. A small cost in a pointer handler repeats for each move, and a small cost in a row repeats for each row. The user sees the sum as a late answer or a dropped frame.

**Applies to:** code. The hot path is the render of a part that a page holds many times, each handler for a scroll, a resize, a pointer move, or a key, each `requestAnimationFrame` callback, each observer callback, and each function that they call.

**Signs you missed it:**

- A layout read (`getBoundingClientRect`, `offsetWidth`, `getComputedStyle`) between two style writes. Each read after a write makes the browser do layout again. Do all reads first, in one `requestAnimationFrame` or in a `ResizeObserver` callback, which runs after layout and before paint.
- React state that a pointer move or a scroll sets, when only one node changes. Write a CSS variable or a style to that node, or read an external store through a selector.
- A context value that changes for each event, so each consumer renders again.
- One listener or one observer for each instance, when one shared listener serves the page.
- Work at mount for an item that is off screen: a measure, an engine, or a layer. Do it when the item gets near the viewport or on the first interaction.
- A `useMemo`, a `useCallback`, or a `memo` that someone added for speed. The React Compiler already memoizes each component ([CONVENTIONS.md § React Compiler](../../CONVENTIONS.md#react-compiler)).
- A speedup with no benchmark. See [explain the number](./explain-the-number.md).

**In this repo:**

- `Table` puts mutation and scroll into one `requestAnimationFrame` layout read for its overflow affordance. It reads a resize in the `ResizeObserver` callback, so the affordance is correct in the first painted frame.
- `useBreakpoint` shares one set of `matchMedia` subscriptions between all callers.
- A chart activates when it gets near the viewport, and it builds its hover layers on the first active datum ([decision](../../decisions/2026-11-12-chart-engine-optimization.md)).
- A chart's tooltip surface reads the hover through selectors, so a data update does not render the surface of a chart that nobody points at.

**Enforced by:** the React Compiler build for memoization. Review for the rest, with a benchmark for each claim of a speedup.
