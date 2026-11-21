# The cx merge covers the classes that mantle and its apps write

**Date:** 2026-11-21
**Status:** Accepted
**Builds on:** #1737 (mantle's own merge) and #1738 (the build-time fold)

## Context

#1737 replaced the `tailwind-merge` port in `cx` with mantle's own merge. Review fixes in that pull request made the merge match `tailwind-merge` 3.7.1 in cases that no app uses. The `@ngrok/mantle/cx` bundle went from 6.7 KB to 8.3 KB gzip (rolldown minify, gzip -9). Cody Price set the rule: the least code that is correct for our use cases. Parity with `tailwind-merge` for classes that no app writes is not a goal.

To find which review fixes real code needs, we removed each fix from the merge, one at a time, and measured the bundle:

| Item                                                                                                              | gzip    |
| ----------------------------------------------------------------------------------------------------------------- | ------- |
| A list of valid values for each of about 100 roots (the custom-class fix)                                         | 1.09 KB |
| The `tailwind-merge` 3.7.1 arbitrary-value validators, and the changes to `bg`, `mask`, and `font` that they need | 0.35 KB |
| Container and filter fixes (`@container/name`, `@container-size`)                                                 | 0.09 KB |
| Value checks on `flex`, `transition`, `object`, `list`, and `scrollbar`                                           | 0.05 KB |
| The `cx` argument cache fix                                                                                       | 0.05 KB |
| The group-slot reserve and the variant-slot limit                                                                 | 0.02 KB |

The evidence for real use: 14.5k class strings from mantle, ngrok-private/frontend, and ngrok-private/ngrok (10,051 distinct classes). We merged every pair of classes that share their first segment (554,676 pairs) with each version of the merge, and merged each real string.

## Decision

1. **Remove the per-root value lists.** A class with a Tailwind root, such as `animate-in` or `items-brand`, now merges with the Tailwind utilities of that root. The spacing roots (`p`, `m`, `w`, `inset`, …) and `z`, `order`, `self`, `select`, `whitespace`, `row`, `col`, and `scheme` keep their value checks, so `my-app` and `top-ranked` still do not merge.
2. **Go back to one arbitrary-value classifier.** The merge reads the kind of an arbitrary value (a length, a color, an image, a shadow, or a label) once, with a short list of units and functions.
3. **Remove the value checks on `flex`, `transition`, `object`, `list`, and `scrollbar`.**
4. **Keep** the container and filter fixes, the cache fix, the slot limits, the full 3.7.1 conflict table, the mask groups, the type roles, and the build-time fold. Real code uses each of them.
5. **Two named exceptions remain:**
   - `invert-theme` is mantle's theme island class (Sandbar, the frontend consent banner). It sets the theme variables, not the `invert` filter, so it is a keyword with its own class group.
   - `zoom` takes only an integer. tw-animate-css `zoom-in-95` and `zoom-out-95` set the enter and exit scales, so they stay apart from each other and from Tailwind's `zoom-50`.

The bundle is 6.8 KB gzip (19.2 KB minified), from 8.3 KB. In V8 (Node 26), the first render of 400 calls and a cache miss take the same time as before, and `cx` keeps about 90 KB less memory after the renders.

## The classes that now merge differently from tailwind-merge

None of the 14.5k real strings merge differently from #1737. Of the 554,676 real pairs, 97 merge differently. These are the kinds of class where the merge and `tailwind-merge` do not agree:

- **A custom or plugin class with a Tailwind root.** Examples: `items-brand`, `flex-brand`, `cursor-brand`, `rounded-brand`, `animate-brand`, `leading-brand`, and 178 more roots in the old probe test. The class merges with the Tailwind utility of its root. For the plugin and mantle classes that apps use, this is correct by the CSS, because they set the same property:
  - tw-animate-css `animate-in` and `animate-out` set `animation`, so `data-state-open:animate-none` removes `data-state-open:animate-in`.
  - mantle's `cursor-inherit` sets `cursor`, so it replaces `cursor-pointer`.
  - `blur-0` and `blur-[4px]` set the blur, so the later one wins. `tailwind-merge` keeps both, because `blur-0` is not on its scale.
- **Arbitrary lengths with units outside the list.** `text-[2cap]`, `text-[2vi]`, `text-[3svb]`, and `text-[--spacing(4)]` read as a color, so they do not replace `text-2xl`. The same applies to `[0]` on `text`.
- **Labels that name no kind that the root reads.** On `text`, `[percentage:50%]`, `(percentage:--x)`, `[size:2px]`, `(size:--x)`, `[number:3]`, `(number:--x)`, `[position:10px]`, and the other labels read as a color. `tailwind-merge` gives each one its own class group.
- **Image functions outside the list.** `image-set()`, `cross-fade()`, and `element()` read as a color, not an image.
- **Shadows that start with a fraction.** `[.5px_1px_2px_black]` is not a shadow, so `shadow-[.5px_1px_2px_black]` reads as a shadow color.
- **Unlabeled arbitrary font values.** `font-(--x)` and `font-[Inter]` read as a font family. `tailwind-merge` reads them as a weight.
- **Bare `font-400` and other number weights.** `font-400` reads as a weight, so it replaces `font-bold` and keeps `font-sans`. `tailwind-merge` reads it as a family.
- **Arbitrary container types**, such as `@container-[size]/sidebar`. They merge with `@container`.

## How to bring a case back

Each case is a small change in `packages/mantle/src/utils/cx/merge.ts`. Add the change when a real class string needs it, and add the class to the oracle test in `merge.test.ts` or a pin in `cx.test.ts`.

- **A custom class must not merge with its root.** For one class, add it to `KEYWORDS` with its own class group, as `invert-theme` does. For a root where many custom classes appear, add a value pattern to `VALUE_SHAPES`, as `zoom` does. The removed per-root lists are in commit 1048268b.
- **An arbitrary unit or function.** Add it to `ARBITRARY_LENGTH`, `ARBITRARY_COLOR`, `ARBITRARY_IMAGE`, or `ARBITRARY_SHADOW`.
- **A label.** Add it to `LABEL_KINDS`, and read its kind in the root's function in `VALUE_ROOTS`.
- **A font weight or family.** Change the `font` function in `VALUE_ROOTS`.

## Alternatives considered

- **Keep tailwind-merge parity.** Rejected: 1.5 KB gzip on each page that uses `cx`, for classes that no app writes. The per-root lists also kept `animate-in` and `animate-none` apart, which is wrong by the CSS.
- **Keep the 3.7.1 validators and remove only the per-root lists (7.1 KB).** Rejected: the validators change no real pair.

## Consequences

- The oracle tests check every class in Tailwind's class list against `tailwind-merge`, and the arbitrary values that mantle and its apps write. They do not check other arbitrary values or custom classes.
- An app that starts to use a class in the list above gets the merge described there. The fix is one of the changes in "How to bring a case back".
