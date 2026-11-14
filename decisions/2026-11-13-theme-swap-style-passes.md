# One style pass for a theme swap

**Date:** 2026-11-13
**Status:** Accepted
**Amends:** section 3 of [2026-10-23-theme-controls-by-surface.md](./2026-10-23-theme-controls-by-surface.md) (the rule that stops transitions no longer runs on each swap).
**Evidence:** the docs site on the dev server, headless Chromium at 1440 by 900, one browser session for each variant. One swap is the median of 7. A burst is 10 clicks, 80 ms apart. Style passes come from a trace (`UpdateLayoutTree` events and their element counts).

## Context

A theme swap felt slow on the Bar Chart docs page and fast on the home page. The chart engine was not the cause: a swap ran 5 ms of script there. A trace showed three style passes over the whole document for each swap, on each page:

1. `setTheme` set `data-theme-transition` on `<html>`, which turned on a `transition: none` rule for every element.
2. The update changed the theme.
3. The end of the swap removed the attribute.

The Bar Chart page holds 12,645 elements against 3,754 on the home page, so each pass cost about three times as much.

The 2026-10-23 record measured the rule on a page of 5,000 rows that each held a transition. On that page the rule is cheap, because it stops 5,000 transitions. The Bar Chart page starts 143 transitions on 95 elements, and there the rule costs two passes to stop them.

## Decision

1. **The swap cancels the transitions in script.** After the update it reads `document.getAnimations()` and cancels each CSS transition outside a switcher icon. That read flushes the one style pass that the new theme needs.
2. **A page that holds many transitions keeps the rule.** Chromium sorts the list that `getAnimations` returns. On sibling rows, 1,000 transitions take 6 ms, 2,000 take 37 ms, and 5,000 take 437 ms. The swap reads the transition duration of 256 elements, spread over the document, and estimates how many elements hold a transition. The estimate is an upper bound: it is 585 on the Bar Chart page, where 95 elements start one. When the estimate is above 2,000 elements, the swap sets `data-theme-transition-many` inside the update, and the rule stops the transitions as before. At that count the sort costs about as much as the two passes that the rule adds.
3. **Each open surface holds its own mark.** The rule that stops the exit animation of a closing dialog or menu hung under `:root[data-theme-transition]`. A root attribute with a descendant rule restyles every element that has a `data-slot`: 4,490 elements on the Bar Chart page, two times for each swap. The swap now sets the attribute on each dialog or menu surface that is open when it starts.

## Consequences

| Page                        | Measure               | Before | After  |
| --------------------------- | --------------------- | ------ | ------ |
| Bar Chart (12,645 elements) | One swap, main thread | 262 ms | 161 ms |
| Bar Chart                   | One swap, style       | 171 ms | 55 ms  |
| Bar Chart                   | Burst, main thread    | 853 ms | 686 ms |
| Bar Chart                   | Burst, latest click   | 123 ms | 15 ms  |
| Home (3,754 elements)       | One swap, main thread | 87 ms  | 49 ms  |
| Home                        | One swap, style       | 57 ms  | 18 ms  |

- A transition that starts later in the reveal, such as a hover fade, now runs. Before, the rule stopped it too.
- The estimate is a sample. A page near the limit can take either path; both show the new colors at once.

## Measured and not shipped

- **The attribute set inside the update, with the rule kept:** two passes in place of three, but the shared pass costs more (66 ms against 44 ms on the Bar Chart page). One swap was 225 ms.
- **A walk of every element with `element.getAnimations()`:** Chromium filters the sorted list of the document for each call, so it is slower than one read.

## Deferred

- **`content-visibility: auto` on `CodeBlock`.** The 28 code blocks of the Bar Chart page hold 78% of its elements. With the property on them, one swap fell from 163 ms to 71 ms in a first test. The block needs a size estimate from its line count, or the page height moves as blocks render.
