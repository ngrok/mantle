# One stylesheet: every color token is a `light-dark()` pair

**Date:** 2026-10-25
**Status:** Accepted
**Completes:** decision 4 of [2026-10-22-two-themes-and-a-two-state-toggle.md](./2026-10-22-two-themes-and-a-two-state-toggle.md) (fold `mantle-dark.css` into `mantle.css`)
**Amends:** decision 6 of [2026-03-08-css-performance-optimizations.md](./2026-03-08-css-performance-optimizations.md) (split the themes into lazy `<link>` stylesheets)
**Applies to:** `packages/mantle/src/mantle.css`, `@ngrok/mantle/theme`, `packages/mantle/src/components/chart/colors.ts`, and every app that loads mantle's CSS

## Context

Mantle has two themes since 2026-10-22, and every app that ships mantle loads both. The dark sheet is applied on every page, light pages included, because an `invert-theme` island on a light page paints in dark. The split saved no request, and it cost this:

- **Two copies of the palette per island.** The light block, a 263-line "light palette restore" block scoped to dark-page islands, the dark block in `mantle-dark.css`, and a 73-line block that re-declared the semantic aliases on every island. Four places held one theme's values, and a guard test suite kept them in step.
- **A consumer palette override did not reach an island.** The restore block pinned Tailwind's stock values, so a rebranded ramp showed on the page and not inside an island.
- **A second `<link>` and two public exports** (`MantleStyleSheets`, `mantleStyleSheetUrls`) that every app had to wire, and a `forceTheme` failure mode that came from the second sheet winning the cascade.

[`light-dark()`](https://www.w3.org/TR/css-color-5/#light-dark) resolves at the element that paints, against that element's `color-scheme`. A custom property holds it unresolved, so a token declared once at `:root` inherits as written and resolves again in each subtree.

## Decision

1. **Every palette stop is one `light-dark(<light>, <dark>)` pair in mantle's `@theme`.** A generator built the pairs from the light block, Tailwind's defaults, and the dark block, so no value was typed by hand. Gray stays an alias of neutral. In `@theme`, Tailwind emits only the stops a build uses, and a consumer `@theme` override replaces a stop in both themes.
2. **The semantic tokens are declared once at `:root`.** 38 of the 65 are the same expression in both themes, because the ramps they read already change. 23 are `light-dark()` pairs, and 4 are not colors (decision 3).
3. **Two `color-scheme` rules select the theme**, for the page and for `.invert-theme` islands on pages of the other theme. They keep the `[data-theme="…"]:not([data-applied-theme])` guard. They also declare the four values that are not colors (two shadow opacities, two checkbox icon URLs), because `light-dark()` holds colors only.
4. **An island is the `color-scheme` flip and nothing else.** The restore block, the alias block, and the island selector on the Shiki tokens are deleted.
5. **`mantle-dark.css`, `MantleStyleSheets`, `mantleStyleSheetUrls`, `MantleStyleSheetsProps`, and `MantleThemeCssUrls` are deleted.** The bump is `minor`. Migration 0012 and its codemod carry the steps.
6. **The chart resolver picks the `light-dark()` argument from the root's computed `color-scheme`** (`pickLightDark` in `colors.ts`). The canvas cannot parse `light-dark()`, and the probe it would fall back to forces one style recalculation per color, which [2026-10-08-chart-list-mount-cost.md](./2026-10-08-chart-list-mount-cost.md) removed. A scheme of `light dark` or `normal` still goes through the probe.
7. **`ThemeProvider` and the flash script do not change.** They store the preference, resolve `"system"`, write the class and the data attributes, and sync tabs. The CSS strategy does not reach that work. The `dark:` variant and the public `.dark` class and `data-applied-theme` still need the resolved theme on `<html>`.

## Consequences

- **The resolved colors are identical.** Compiled with Tailwind 4.3.3 and read in Chromium through a `color: var(--token)` probe: 407 custom properties, 8 `<html>` states (no class, `.light`, `.dark`, `data-theme` only in each theme, forced light and forced dark against the other preference, `system` resolved dark), and three positions (page, island, nested island). 9,792 comparisons, 0 differences. Two injected defects (one dark stop, one `data-theme` selector) produced 36 and 358 differences, so the comparison can fail. The chart gates (`tokens.test.ts`, `decorative-contrast.test.tsx`) pass on the single file with their recorded literals unchanged.
- **Less CSS, one request.** With the 13,407 candidates Tailwind's scanner finds in `packages/mantle/src` (the `source-all.css` case), the two files compiled to 253.0 KB raw and 36.3 KB gzip; the one file compiles to 227.1 KB raw and 30.7 KB gzip. With every palette stop forced into the build, 102.9 KB became 82.0 KB.
- **A higher browser floor.** `light-dark()` needs Safari 17.5, Chrome 123, or Firefox 120. Tailwind 4's own floor is Safari 16.4, Chrome 111, and Firefox 128. Between the two floors, a color token is invalid at computed-value time: backgrounds go transparent, and text takes the browser default. On ngrok.ai, the browsers in that window made 346 of 75,758 pageviews (0.46%) and were 106 of 22,257 people (0.48%), from PostHog `$pageview` events for 2026-09-25 to 2026-10-25. Most are Chrome 111 to 122 and Firefox 115 ESR. Older browsers already paint no mantle color, because every token is `oklch()`. Tailwind's Lightning CSS pass excludes `Features.LightDark`, so no build step polyfills it.
- **`getPropertyValue` returns the pair.** Code that reads a color token from JavaScript gets `light-dark(…)` text in both themes and must read it through a color property. The chart resolver does; the migration guide names the pattern for apps.
- **A palette stop set on a bare `:root` applies in both themes.** It used to apply in light only, because the dark block outranked it. A stop or a semantic token set under `:root.dark` works as before.
- **The guard suite tests the new shape.** `invert-theme.test.ts` pins the two `color-scheme` rules and their selectors, that no other rule targets `.invert-theme`, that every Tailwind ramp stop has a pair, that each light value is Tailwind's default or a named mantle stop, and that each dark value is the light value of the mirror stop. One stop breaks the mirror: dark `sky-400` keeps Tailwind's stock `sky-600`, not mantle's custom light `sky-600`. The test names it. The browser tests read resolved colors.

## Alternatives rejected

- **Keep `mantle-dark.css` and gate it with `media`.** Every page loads it for `invert-theme` islands, so the gate saves nothing (decision 4 of 2026-10-22).
- **Fold the dark block into `mantle.css` as a `:root.dark` rule.** It removes the request and keeps the four copies of the palette, the restore block, and the island alias block.
- **A `@supports not (color: light-dark(red, red))` fallback.** It needs the light palette a second time as plain values, which is the duplication this change removes, and it serves 0.46% of pageviews.
- **Let Lightning CSS polyfill `light-dark()`.** The polyfill substitutes at the element that declares the token, so `:root` would resolve every token once and islands would inherit the page theme.
- **Make `"system"` pure CSS** (`color-scheme: light dark` on `[data-theme="system"]`). Colors would follow the OS with no script, but the `dark:` variant, the `.dark` class, `data-applied-theme`, and `useAppliedTheme` still need the resolved theme on `<html>`. Two sources for one fact can disagree.

## Deferred

- **The four Tailwind ramps with no dark values** (`mauve`, `mist`, `olive`, `taupe`) paint their light values in both themes, as they did before this change. Reopen when a component or an app uses one.
- **The four internals with `dark:` tweaks** (Progress Bar, Progress Donut, Skeleton, Table) can move to `light-dark()` tokens, so they flip inside an island. Reopen with the next change to any of them.
- **A CSS-only `"system"` theme** (rejected above). Reopen if mantle drops the `.dark` class and `data-applied-theme` as public contract.
