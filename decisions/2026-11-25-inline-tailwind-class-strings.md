# Component styles stay inline Tailwind classes

**Date:** 2026-11-25
**Status:** Accepted
**Builds on:** [2026-11-21-cx-merge-scope.md](./2026-11-21-cx-merge-scope.md), [2026-11-21-trim-unused-palettes.md](./2026-11-21-trim-unused-palettes.md), #1931 (plain variant maps)

## Context

Mantle components write their styles as Tailwind class strings in the TSX, next to the markup. Some lists are long, such as the ones in `DropdownMenu`, `Select`, and `Combobox`. Cody Price asked if a different home for these styles makes the pages that use mantle smaller or faster. Three options:

- **Inline Tailwind classes** (today). The class strings ship in the JavaScript and in the server HTML. A consumer's Tailwind build scans mantle's dist and emits only the utilities in use.
- **Shared utilities in `mantle.css`.** A `@utility` with `@apply` holds a class list. The component writes one class name.
- **Co-located CSS.** A CSS module or a plain CSS file beside each component, compiled to a small sheet.

Each option moves bytes between three places, and each place has a different cost:

- **CSS** blocks rendering. The browser parses all of it before the first paint, so minified size matters, not only gzip size.
- **JavaScript** must download and parse before hydration.
- **HTML** is gzip-compressed on the wire. Repeated class lists compress to almost nothing.

### Measurements

All numbers are from one build on 2026-11-25: Tailwind 4.3.5, lightningcss at mantle's browser floor, and the `scripts/bundle-size.ts` scenarios.

**JavaScript.** Class strings are 6–11% of a page's mantle JavaScript. The ceiling replaces every class list with a short token:

| Scenario         | Eager JS (gzip) | Without class lists | Ceiling       |
| ---------------- | --------------- | ------------------- | ------------- |
| `button`         | 9,396 B         | 8,400 B             | −996 B (11%)  |
| `select`         | 16,315 B        | 14,992 B            | −1,323 B (8%) |
| `combobox`       | 16,337 B        | 14,894 B            | −1,443 B (9%) |
| `dropdown-menu`  | 16,463 B        | 15,449 B            | −1,014 B (6%) |
| `marketing-page` | 29,779 B        | 27,689 B            | −2,090 B (7%) |
| `form-page`      | 21,178 B        | 19,197 B            | −1,981 B (9%) |

The ceiling is not reachable. `group/*` and `peer/*` markers and `@container` names cannot go through `@apply`. Lists with `starting:` or `motion-reduce:` classes must sort after a consumer's classes, and a utility sorts first.

**CSS.** We moved every class list into a generated `@utility` and compiled the sheet:

| Scan set                                | Inline today               | Every list moved           | Change                      |
| --------------------------------------- | -------------------------- | -------------------------- | --------------------------- |
| A `Select` page (`mantleSourcesPlugin`) | 13,433 B gz (65.6 KB min)  | 13,360 B gz (69.3 KB min)  | −73 B gz, +3.7 KB min       |
| A `DropdownMenu` page                   | 12,740 B gz (61.7 KB min)  | 12,952 B gz (67.3 KB min)  | +212 B gz, +5.6 KB min      |
| All of mantle (`source-all.css`)        | 39,921 B gz (240.8 KB min) | 45,737 B gz (316.1 KB min) | **+5,816 B gz, +75 KB min** |

The sheet grows because `@apply` copies each declaration into the new rule. Other parts still use most of the same classes, so the plain utility rules stay too. Variant classes expand into many nested rules.

**HTML.** Class attributes are 61–80% of a part's server HTML, but gzip absorbs most of it:

| Server-rendered part | HTML    | `class` share | HTML gzip | gzip with one-word classes |
| -------------------- | ------- | ------------- | --------- | -------------------------- |
| 10 × `Button`        | 7,891 B | 75%           | 430 B     | 163 B (−267 B)             |
| `Tabs`, 5 triggers   | 6,977 B | 80%           | 880 B     | 300 B (−580 B)             |
| `Select`, closed     | 1,769 B | 69%           | 647 B     | 305 B (−342 B)             |
| `Accordion`, 5 items | 3,190 B | 61%           | 462 B     | 212 B (−250 B)             |

The first instance of a part costs 250–600 B gzip of class text. Each repeat costs almost nothing. Chromium stores identical `class` values as one atomic string, so many elements with one class list share one copy in memory. We did not measure parse time or memory.

### The floating-surface trial

#1931 first moved the class list that `Popover`, `Tooltip`, `HoverCard`, and `DropdownMenu` share into a `floating-surface` utility. It saved about 80 B gzip of JavaScript on each page with a float and added 113 B gzip to `source-all.css`. An adversarial review then found four regressions. Each one came from the move into a utility:

- An `@apply` of a theme token (`ease-out-strong`) breaks the build for an app that resets that scale with `@theme { --ease-*: initial; }`.
- `cx` no longer removes a conflicting class. A slotted `Card.Root` kept `relative` over the float's `fixed`, so a scrolled page drew the menu in the wrong place.
- The sort order flips. `className="truncate"` clipped the tooltip arrow, because the utility's `overflow-visible` sorts before `truncate`.
- A consumer state variant, such as `not-data-disabled:opacity-100`, beat the closed-state fade.

We removed the utility before the merge.

## Decision

1. **Inline Tailwind classes stay the default** for component styles.
2. **No co-located CSS and no CSS modules.** A precompiled sheet for each component copies the Tailwind utilities it uses. A consumer then gets each declaration twice: once from mantle's sheet and once from their own Tailwind build. It also adds a second styling system, a CSS import for each entry, and a load-order rule against the consumer's Tailwind layers. The JavaScript it saves is the same 1–2 KB ceiling as above.
3. **No broad move of class lists to `@utility`.** It saves at most 1–2 KB gzip of JavaScript on a page. It adds up to 5.8 KB gzip (75 KB minified) of render-blocking CSS for `source-all.css` users. It breaks the `className` contract below.
4. **A `@utility` in `mantle.css` is for a style that Tailwind cannot write as classes**, such as `invert-theme`. It is not a container for a component's class list.
5. **The `className` contract:** a consumer's `className` goes last into `cx`. `cx` removes each mantle class that conflicts with it, so the consumer's class wins by the merge, not by the CSS sort order. Every change to a component's classes keeps this true.

## Other levers

These shrink what mantle ships without a new styling system or a larger stylesheet:

- **Remove classes that emit no CSS.** A class that no utility, theme token, or selector matches costs JavaScript and HTML for nothing. #1934 removed nine.
- **Share repeated lists as JavaScript constants.** When two parts in one module graph repeat a list, one exported string removes the copy and keeps the `cx` merge and the sort order. The candidates are the `Combobox` and `MultiSelect` popup (190 B minified), the `Dialog` and `Sheet` body (136 B), the `Dialog` and `AlertDialog` enter and exit animation (135 B), the `AppLayout` and `Panel` scroll body and header (159 B), and outlined neutral `Button` and outlined `IconButton` (268 B).
- **Plain variant maps over a runtime library.** #1931 replaced `class-variance-authority` with `satisfies Record<…, string>` maps: −5,647 B gzip across 15 of 34 scenarios.
- **`mantleSourcesPlugin` and `mantleThemePrunePlugin`.** The first scans only the mantle files a bundle reaches. The second removes the dark values of unused tokens. Both cut the CSS without a change to components.
- **`cx` itself.** It is 6.7 KB gzip on every page, more than any class-string change above. A smaller `cx` needs a decision on the merge contract ([2026-11-21-cx-merge-scope.md](./2026-11-21-cx-merge-scope.md)).

## Alternatives considered

- **Move every class list to `@utility`.** Rejected: see Decision 3.
- **Shared utilities only where a list repeats.** Rejected for now: the floating-surface trial shows the override risk for 80 B of JavaScript. A JavaScript constant gets the same saving without the risk.
- **CSS modules or plain co-located CSS.** Rejected: see Decision 2.

## Consequences

- Class strings stay in the JavaScript and the server HTML. The JavaScript and the class attributes are larger than with utilities, by at most 1–2 KB gzip of JavaScript and 250–600 B gzip of HTML for each part's first instance.
- The stylesheet holds only the utilities a build uses, and each declaration once.
- A consumer override through `className` keeps working the same way in every component.
- To reopen this decision, measure all three costs (CSS minified and gzip, JavaScript gzip, HTML gzip) with `source-all.css` and with `mantleSourcesPlugin`, and run the override checks from the floating-surface trial.
