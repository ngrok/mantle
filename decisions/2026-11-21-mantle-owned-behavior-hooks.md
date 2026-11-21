# Mantle owns its behavior hooks, and removes its headless component libraries

**Date:** 2026-11-21
**Status:** Accepted (2026-11-21)

## Context

Mantle wraps four headless stacks: Radix, Ariakit, Headless UI (with React Aria under it), and cmdk. Each stack ships its own copy of the same jobs: selection state, an item registry, roving focus, typeahead, dismiss and Escape, focus trap, scroll lock, positioning, and portals. Mantle also adds its own layer to patch the gaps between them, such as the overlay stack in `layer-container.tsx`.

A Vite 8 build of `main` (minified, React external) measured the cost:

| Page                                                       | Minified |    Gzip | Headless share                  |
| ---------------------------------------------------------- | -------: | ------: | ------------------------------- |
| Marketing (Button, DropdownMenu, Dialog, Tooltip, Tabs, …) | 193.6 KB | 60.5 KB | about 2/3 Radix and floating-ui |
| Select and Combobox                                        | 251.3 KB | 83.0 KB | Radix Select and Ariakit        |

A prototype put Select and Combobox on one mantle listbox hook. The same page went to 59.3 KB minified (19.7 KB gzip, −76%), and passed a Chromium test of the WAI-ARIA keyboard, ARIA, and focus contract.

## Decision

1. **Behavior hooks are a layer of their own** in `packages/mantle/src/behaviors/`. The `@ngrok/mantle/hooks` export stays a set of general React utilities. A behavior hook stays internal until two components use it and its API is stable.
2. **A hook owns one WAI-ARIA APG pattern or one primitive job.** Its JSDoc links the APG pattern. A compound part composes hooks: the root calls the pattern hook and puts its result in context, and each part calls a part hook that returns the props for one element.
3. **The hooks are SSR- and hydration-correct:**
   - The server render and the first client render give the same markup. A popup or a portal renders only after hydration (`useIsHydrated`).
   - Shared state that a part reads lives in a store that the part reads with `useSyncExternalStore` and a selector. A part never copies state into React state with an effect.
   - `useEffect` and `useLayoutEffect` are the last choice. Compute a value during render. Do a change in the event handler that causes it. Bind a DOM listener or an observer in a React 19 ref callback with a cleanup. An effect needs a `Why` comment that names why none of these works.
   - Nothing reads `window` or `document` during render.
4. **A hook has no dependencies, and each hook is its own module**, so a page pays only for the hooks it renders.
5. **The CI bundle budget guards the result.** `packages/mantle/bundle-budget.json` pins the gzip size of each affected component and of two page shapes. A step that removes a library lowers its numbers in the same change.
6. **Fix the algorithm before you memoize, and keep the compiler only where it pays.** A closed popup renders no options. The React Compiler stays on a hook or part when a measurement shows a gain. The listbox hooks and the Select, Combobox, and MultiSelect parts keep it: without it, a parent render of an open list of 200 options costs 1.3 to 3.0 ms in place of 0.55 to 1.1 ms (Node, happy-dom, React production build). Without it, the bundle saves about 1.3 KB (gzip) per picker, and memory changes by less than 3%. The build gives a part that calls no hook and creates no function in render `"use no memo"` (CONVENTIONS.md § React Compiler). Do not optimize for React Server Components: a part is RSC-safe only when that costs nothing.
7. **The migration goes from the cheapest step to the hardest.** Slot, then the leaf controls (Switch, Progress, RadioGroup), then Select, Combobox, and MultiSelect, then Tabs, the floating family, Dialog, Command, DropdownMenu, and Slider. Each step removes a dependency when it is done.

## Consequences

- Mantle owns the accessibility contract. Each pattern gets one Chromium contract test (keyboard, ARIA, focus, Escape inside a `Dialog`, and axe at the WCAG A and AA tags), and a manual screen-reader pass before it ships.
- A step can change behavior that a user sees, for example where focus goes. Each such change gets a changeset, and a breaking API change gets a migration guide.
- Mantle maintains about 3,000 to 4,000 more lines of source and tests, and removes the code that patches the libraries.
