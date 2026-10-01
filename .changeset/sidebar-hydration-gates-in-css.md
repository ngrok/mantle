---
"@ngrok/mantle": patch
---

`Sidebar.Nav` now stamps `data-hydrated` one frame after hydration instead of in the hydration commit. A persisted-collapsed state that a controlled `open` applies after hydration (the `useLocalStorage` recipe) used to commit in the same flush as the stamp, so the collapse animated shut on page load. It now snaps into place.

`Sidebar.Nav` and `Sidebar.GroupLabel` key their hydration gates off `data-hydrated` in CSS instead of toggling classes in JS, with one negated variant per gate: `max-{breakpoint}:not-data-hydrated:hidden` for the pre-hydration visibility gate, `not-data-hydrated:transition-none` for the panel's width transition, and `group-not-data-hydrated/sidebar-nav:transition-none` for the label's fade. The gates no longer override consumer utilities: a `className` display utility holds above `mobileBreakpoint` before hydration as well as after, and a consumer `transition-none` or `duration-*` now replaces the default transition through tailwind-merge.

`Sidebar.Nav` also owns `data-state` and `data-hydrated`: a value passed through props no longer overrides either.

`useIsHydratedAfterPaint` is a new hook in `@ngrok/mantle/hooks`. It returns `false` on the server, in the hydration render, and in the mount commit, then `true` from the next animation frame. Use it to gate a CSS transition that must not run on a post-hydration state correction, where `useIsHydrated` flips too early. `Sidebar.Nav` stamps `data-hydrated` from it.
