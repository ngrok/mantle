---
"@ngrok/mantle": patch
---

Add `Tabs.ListBorder`: compose it as a child of `Tabs.List` to draw a 1px bottom border under the horizontal classic tablist, in the `separator` color token. The border terminates at the ends of the tab triggers instead of running the full container width (the list sizes `w-fit`, capped at the container, and the border is painted on the list's content box so the focus-ring breathing padding doesn't widen it), and it sits just below the active trigger's decoration. Omit `Tabs.ListBorder` to render no border; the pill appearance never draws one, so it is always safe to compose. Recolor via the `--tabs-list-border-color` CSS variable (default: `var(--color-separator)`). Activation is a pure-CSS `:has()` check, so it is SSR-safe with no client-side effects.

Also: the horizontal classic `Tabs.List` now sizes `w-fit max-w-full` (previously `w-full`) so the border hugs the triggers, `Tabs.Root` renders a `data-appearance` attribute for appearance-scoped styling, and the vertical classic tablist side border uses the `separator` token (previously `gray-200`).

Migration notes:

- To show the restored bottom border, add `<Tabs.ListBorder />` as a child of your classic `Tabs.List` (and remove any hand-rolled `border-b` workaround).
- If your `Tabs.List` layout relied on the list spanning its container (e.g. `grid grid-cols-4`), add an explicit width class such as `w-full` to your `className` — the classic horizontal list now hugs its triggers.
