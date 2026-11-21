---
"@ngrok/mantle": minor
---

Add `Typography` (`@ngrok/mantle/typography`): headings and paragraphs in the site's type scale, plus a container for HTML that no one maps to components.

- `Typography.H1` to `Typography.H6` render the heading element of their name. `Typography.P` renders a paragraph in the body text color.
- `Typography.Root` renders a `div` with the new `type-prose` utility. It styles the headings, paragraphs, and lists directly inside it, such as CMS or MDX output. Pass `asChild` to render an `article`.
- Each part stamps a `data-slot`: `typography`, `typography-h1` to `typography-h6`, and `typography-p`.
- The parts use no context, so they need no provider. HTML with no React gets the same styles from the classes, such as `text-heading-1` and `type-prose`.

`mantle.css` adds type-role tokens in `@theme`: `--text-heading-1` to `--text-heading-6`, `--text-paragraph`, and `--text-lead`, each with `--line-height`, `--letter-spacing`, and `--font-weight` sub-keys, and `--font-heading`. They make the `text-heading-1` to `text-heading-6`, `text-paragraph`, `text-lead`, and `font-heading` classes. The values match the scale on the Typography base page. A site sets its own scale with a `@theme` block after the mantle import. It must set every sub-key of a role it changes, because a sub-key it leaves out keeps mantle's value.

`cx` now treats the type-role classes as font sizes. `cx("text-heading-2 text-strong")` keeps both classes, and `cx("text-heading-2 text-heading-4")` keeps the last one.

See https://mantle.ngrok.com/components/data-display/typography and https://mantle.ngrok.com/base/typography.
