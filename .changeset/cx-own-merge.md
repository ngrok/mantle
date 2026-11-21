---
"@ngrok/mantle": patch
---

`cx` resolves Tailwind CSS conflicts with mantle's own merge instead of a port of `tailwind-merge`. The `@ngrok/mantle/cx` bundle is about 25% smaller (6.8 KB gzip, from 9.1 KB). In V8 (Node 26), the first render of 400 `cx` calls takes about 30% less time, a call that misses the cache is about 2.4× faster, and `cx` keeps about 40% less memory.

The output is the same as before for the class strings in mantle and its main consumers. The merge covers the classes that mantle and its apps write; `decisions/2026-11-21-cx-merge-scope.md` lists the custom classes and arbitrary values where it does not match `tailwind-merge`. The output now matches `tailwind-merge` 3.7 where a shorthand utility sets the same CSS property as an earlier utility, which the old port missed:

- `place-items-*`, `place-content-*`, and `place-self-*` replace an earlier `items-*`, `content-*`, `self-*`, or `justify-*` class.
- `px-*`, `py-*`, `mx-*`, `my-*`, `scroll-mx-*`, `scroll-px-*`, `inset-x-*`, `inset-y-*`, and the `border-x-*` and `border-y-*` widths and colors replace their logical sides, such as `ps-*` or `border-s-*`.
- `mask-x-*` and `mask-y-*` gradient stops replace an earlier `mask-l-*`, `mask-r-*`, `mask-t-*`, or `mask-b-*` stop.
- `sr-only` replaces an earlier position, size, padding, margin, overflow, or `whitespace-*` class, because it sets each of them.
- The logical sizes (`inline-*`, `block-*`, `min-inline-*`, `max-block-*`, …) merge across all their values, such as `inline-1/2` and `inline-4xl`.
- `bg-conic` is a background image, so it keeps a background color. `shadow-inner` is a shadow size, so it keeps a shadow color.
