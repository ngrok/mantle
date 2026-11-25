# Component styles stay inline Tailwind classes

**Date:** 2026-11-25
**Status:** Accepted
**Builds on:** [2026-11-21-cx-merge-scope.md](./2026-11-21-cx-merge-scope.md), [2026-11-21-trim-unused-palettes.md](./2026-11-21-trim-unused-palettes.md), #1931 (plain variant maps)

## Context

Mantle components write their styles as Tailwind class strings in the TSX, next to the markup. Some lists are long, such as the ones in `DropdownMenu`, `Select`, and `Combobox`. Cody Price asked if a different home for these styles makes the pages that use mantle smaller or faster. Three options:

- **Inline Tailwind classes** (today). The class strings ship in the JavaScript and in the server HTML. A consumer's Tailwind build scans mantle's dist and emits a rule for each class it finds in the scanned files.
- **Shared utilities in `mantle.css`.** A `@utility` with `@apply` holds a class list. The component writes one class name.
- **Co-located CSS.** A CSS module or a plain CSS file beside each component, compiled to a small sheet.

Each option moves bytes between three places, and each place has a different cost:

- **CSS** blocks rendering. The browser parses all of it before the first paint, so minified size matters, not only gzip size.
- **JavaScript** must download and parse before hydration.
- **HTML** is gzip-compressed on the wire. Repeated class lists compress to almost nothing.

### Measurements

All numbers are from one build on 2026-11-25: Tailwind 4.3.5, lightningcss at mantle's browser floor, and the scenarios of `packages/mantle/scripts/bundle-size.ts`. The build was the #1931 trial revision, which still had the `floating-surface` utility (see below). On the merged #1931, `dropdown-menu` is 16,540 B and `marketing-page` is 29,831 B; the other rows are equal.

**JavaScript.** We replaced each class-list literal of three or more classes with a short token and measured the gzip again. Shorter lists, such as Button's `"h-9 px-3"`, stayed. So the savings below are samples, not a bound, and a page with fewer class strings saves less:

| Scenario         | Eager JS (gzip) | Without class lists | Saving        |
| ---------------- | --------------- | ------------------- | ------------- |
| `button`         | 9,396 B         | 8,400 B             | −996 B (11%)  |
| `select`         | 16,315 B        | 14,992 B            | −1,323 B (8%) |
| `combobox`       | 16,337 B        | 14,894 B            | −1,443 B (9%) |
| `dropdown-menu`  | 16,463 B        | 15,449 B            | −1,014 B (6%) |
| `marketing-page` | 29,779 B        | 27,689 B            | −2,090 B (7%) |
| `form-page`      | 21,178 B        | 19,197 B            | −1,981 B (9%) |

A move to utilities cannot reach these savings. `@apply` rejects `group/*` and `peer/*` markers, so lists with them stay inline. In the floating-surface trial, the utility sorted before a consumer's classes, so a list with `starting:` or `motion-reduce:` classes could not move without a change in behavior.

**CSS.** We compiled the sheet twice: as it is, and with each class list in the scanned dist rewritten to its own generated `@utility`. Each occurrence got its own utility, so identical lists were not shared. Lists that `@apply` rejects stayed inline. The two page rows scan the dist files that the page's entries reach, as `mantleSourcesPlugin` lists them, with no theme prune:

| Scan set                         | Inline today               | Lists moved                | Change                      |
| -------------------------------- | -------------------------- | -------------------------- | --------------------------- |
| A `Select` page                  | 13,433 B gz (65.6 KB min)  | 13,360 B gz (69.3 KB min)  | −73 B gz, +3.7 KB min       |
| A `DropdownMenu` page            | 12,740 B gz (61.7 KB min)  | 12,952 B gz (67.3 KB min)  | +212 B gz, +5.6 KB min      |
| All of mantle (`source-all.css`) | 39,921 B gz (240.8 KB min) | 45,737 B gz (316.1 KB min) | **+5,816 B gz, +75 KB min** |

The sheet grows because `@apply` copies each declaration into the new rule. Other parts still use most of the same classes, so the plain utility rules stay too. Variant classes expand into many nested rules. One utility per distinct list would grow the sheet less, so +5.8 KB is an upper bound for this approach.

**HTML.** Class attributes are 61–80% of a fixture's server HTML, but gzip absorbs most of it:

| Server-rendered fixture | HTML    | `class` share | HTML gzip | gzip with one-word classes |
| ----------------------- | ------- | ------------- | --------- | -------------------------- |
| 1 × `Button`            | 799 B   | 74%           | 370 B     | 145 B (−225 B)             |
| 10 × `Button`           | 7,891 B | 75%           | 430 B     | 163 B (−267 B)             |
| `Tabs`, 5 triggers      | 6,977 B | 80%           | 880 B     | 300 B (−580 B)             |
| `Select`, closed        | 1,769 B | 69%           | 647 B     | 305 B (−342 B)             |
| `Accordion`, 5 items    | 3,190 B | 61%           | 462 B     | 212 B (−250 B)             |

One `Button` and ten `Button`s differ by 42 B of saving, so a repeat costs almost nothing. Content that renders only in the browser, such as a float's panel, adds no server HTML. Chromium stores identical `class` values as one atomic string, so many elements with one class list share one copy in memory. We did not measure parse time or memory.

### The floating-surface trial

Before #1931, `Popover`, `Tooltip`, `HoverCard`, and `DropdownMenu` already shared one `floatClassName` string. The #1931 trial moved most of that string into a `floating-surface` utility and kept `z-50`, `starting:*`, and `motion-reduce:*` inline. The shorter string saved about 80 B gzip of JavaScript on each page with a float and added 113 B gzip to `source-all.css`. An adversarial review then found four regressions. Each one came from the move into a utility:

- An `@apply` of a theme token (`ease-out-strong`) breaks the build for an app that resets that scale with `@theme { --ease-*: initial; }`.
- `cx` no longer removes a conflicting class. A slotted `Card.Root` kept `relative` over the float's `fixed`, so a scrolled page drew the menu in the wrong place.
- The sort order flips. Inline, Tailwind emits `overflow-visible` after `truncate`, so the arrow shows. As a utility, `overflow-visible` sorted before `truncate`, so `className="truncate"` clipped the tooltip arrow.
- A consumer state variant, such as `not-data-disabled:opacity-100`, beat the closed-state fade.

We removed the utility before the merge.

## Decision

1. **Inline Tailwind classes stay the default** for component styles.
2. **No co-located CSS and no CSS modules.** A precompiled sheet for each component holds declarations that a consumer's Tailwind build also emits when the consumer or another part uses the same utility. We did not measure that overlap. Co-located CSS also adds a second styling system, a CSS import for each entry, and a load-order rule against the consumer's Tailwind layers. It removes the same class-list bytes from the JavaScript as the samples above.
3. **No broad move of class lists to `@utility`.** The JavaScript samples above save 1.0–2.1 KB gzip on a page. It adds up to 5.8 KB gzip (75 KB minified) of render-blocking CSS for `source-all.css` users. It also changes how consumer classes override mantle's, as the floating-surface trial showed.
4. **A `@utility` in `mantle.css` is for a design-system style that many parts share**, such as `focus-ring` and `invert-theme`. It is not an alias for one component's class list.
5. **The `className` contract:** a consumer's `className` goes last into `cx`. For each conflict that `cx` recognizes, `cx` removes mantle's class, so the consumer's class wins by the merge. For utilities that set more than one property, such as `truncate` against `overflow-visible`, `cx` keeps both and the CSS order decides. A change to a component's classes must not change either outcome.

## Other levers

These shrink what mantle ships without a new styling system or a larger stylesheet:

- **Remove classes that emit no CSS.** A class that no utility, theme token, or selector matches costs JavaScript and HTML for nothing. #1934 removed nine.
- **Share repeated lists as JavaScript constants.** When two parts in one module graph repeat a list, one exported string removes the copy and keeps the `cx` merge and the sort order. The candidates, in minified bytes of the copy:
  - The `Combobox` and `MultiSelect` popup: 190 B.
  - The `Dialog` and `Sheet` body: 136 B.
  - The `Dialog` and `AlertDialog` enter and exit animation: 135 B.
  - The `AppLayout` and `Panel` scroll body and header: 159 B.
  - Outlined neutral `Button` and outlined `IconButton`: 268 B.
- **Plain variant maps over a runtime library.** #1931 replaced `class-variance-authority` with `satisfies Record<…, string>` maps: −5,647 B gzip across 15 of 34 scenarios.
- **`mantleSourcesPlugin` and `mantleThemePrunePlugin`.** The first limits the scan to the mantle files that the module graph reaches. The second removes unread palette stops from mantle's theme and island selectors. Both cut the CSS without a change to components.
- **`cx` itself.** The `@ngrok/mantle/cx` entry is 6.7 KB gzip. Almost every component imports it, so most pages pay it, more than any class-string change above. A smaller `cx` needs a decision on the merge contract ([2026-11-21-cx-merge-scope.md](./2026-11-21-cx-merge-scope.md)).

## Alternatives considered

- **Move every class list to `@utility`.** Rejected: see Decision 3.
- **Shared utilities only where a list repeats.** Rejected for now: the floating-surface trial traded four override regressions for 80 B of JavaScript. Where two modules repeat a list, a JavaScript constant removes the copy without that risk.
- **CSS modules or plain co-located CSS.** Rejected: see Decision 2.

## Consequences

- Class strings stay in the JavaScript and the server HTML. On the measured pages that costs 1.0–2.1 KB gzip of JavaScript, and 225–580 B gzip of HTML for each fixture above.
- The stylesheet holds a rule for each class in the scanned files. Tailwind can repeat a declaration in two rules, such as `hidden` and `motion-reduce:hidden`.
- A consumer override through `className` keeps working the same way in every component.
- To reopen this decision, measure all three costs (CSS minified and gzip, JavaScript gzip, HTML gzip) with `source-all.css` and with `mantleSourcesPlugin`, and run the override checks from the floating-surface trial.
