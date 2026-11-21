---
"@ngrok/mantle": minor
---

Add `Typography` (`@ngrok/mantle/typography`): headings and paragraphs in the site's type scale, for JSX and for MDX.

- `Typography.H1` to `Typography.H6` render the heading element of their name. `Typography.P` renders a paragraph in the body text color.
- Each part renders the element it is named for, so an MDX `components` map assigns one part to each element: `{ h1: Typography.H1, p: Typography.P }`.
- Each part stamps a `data-slot`: `typography-h1` to `typography-h6`, and `typography-p`.
- The parts are server components. They use no hooks and no context, and their chunk has no `"use client"`, so a React Server Components page renders them with no client JavaScript. `asChild` renders `Slot`, which is a client component.

`mantle.css` adds type-role tokens in `@theme`, with steps that follow Tailwind's `text-*` scale: `--text-heading-xs` to `--text-heading-8xl`, `--text-paragraph-xs` to `--text-paragraph-xl`, and `--font-heading`. Each step has `--line-height`, `--letter-spacing`, and `--font-weight` sub-keys, and its default size matches the Tailwind class of its name. They make the `text-heading-*`, `text-paragraph-*`, and `font-heading` classes. `Typography.H1` to `Typography.H6` use the `5xl`, `3xl`, `2xl`, `xl`, `base`, and `xs` heading steps, and `Typography.P` uses `paragraph-base`. A site sets its own scale with a `@theme` block after the mantle import. It must set every sub-key of a step it changes, because a sub-key it leaves out keeps mantle's value.

`cx` now treats the type-role classes as font sizes. `cx("text-heading-3xl text-strong")` keeps both classes, and `cx("text-heading-3xl text-heading-xl")` keeps the last one.

See https://mantle.ngrok.com/components/data-display/typography and https://mantle.ngrok.com/base/typography.
