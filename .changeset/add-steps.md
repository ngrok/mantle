---
"@ngrok/mantle": minor
---

Add **`Steps`** — a read-only setup guide.

`Steps` renders an ordered list of steps down a page, each marked by a numbered circle in a left gutter, joined by one continuous vertical rail. Every step stays visible and nothing is interactive: this is a guide, not a wizard. For one panel at a time, where a reader clicks a step to reveal it, reach for `Tabs`; for a step that collapses, reach for `Accordion`.

- Compound parts: `Steps.Root` (the `<ol role="list">`), `Steps.Item` (one `<li>`), and `Steps.Title` (an `h3` by default). Every part takes `asChild` and merges a consumer's `className` last
- **Composition order is the numbering.** The number is a CSS counter and the marker's silhouette comes from `:first-child` / `:last-child` / `:only-child`, so inserting, removing, or conditionally rendering a step renumbers the rest natively. There is no `index`, no `count`, and nothing to keep in sync — and the first server-rendered paint is already correct
- The rail is each item's `border-inline-start`, so it spans the item however tall its content grows and runs through the gap to the next step. The last item keeps the width and drops the color, so removing a step shifts nothing sideways. Every offset is a logical property, so the whole layout flips for right-to-left
- Accessible by default: a real `<ol>` of `<li>` with `role="list"` restated, because the design strips `list-style` and WebKit drops list semantics from a list that has none. Step position comes from the list; the markers are one `aria-hidden` unit per step with no text of their own
- Data attributes: `data-slot` on every part (`steps`, `steps-item`, `steps-title`), plus `steps-marker` on the marker in the gutter, so a consumer can hide the marker column on a narrow surface. Every part joins an incoming chain ahead of its own name, so `asChild` composition accumulates the whole chain
- CSS variables: `--color-steps-rail` and `--color-steps-number` are design tokens with a value in all four themes. Override them together on any ancestor to re-theme the rail — the number has to stay readable on the fill, and the fill has to stay opaque

Import it: `import { Steps } from "@ngrok/mantle/steps"`.

Docs: https://mantle.ngrok.com/components/structure/steps
