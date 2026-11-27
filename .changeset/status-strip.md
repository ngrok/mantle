---
"@ngrok/mantle": minor
---

Add `StatusStrip` (`@ngrok/mantle/status-strip`): a row of equal cells over time, such as one cell for each hour or day, each shaded by its share of the time in one state. It renders on the server with no client JavaScript.

- `StatusStrip.Root` renders a `<span>` grid of equal columns (`data-slot="status-strip"`). It is `role="img"`, and its type requires `aria-label` or `aria-labelledby`. When nearby text already says the same thing, pass `aria-hidden` in place of a name: the root then has no role. An empty name throws.
- `StatusStrip.Cell` takes a required `value`: a share from 0 to 1, or `null` for no data. A share above 0 fills with `--status-strip-fill` (default `var(--color-accent-600)`), from 35% strength up to full at 1. A cell at 0 fills with `--status-strip-track` (default `var(--color-gray-300)`), and a cell with no data is an outline in the track color, so it does not read as 0. A value outside 0 to 1, such as `NaN`, throws. Each cell takes its own `title`. It stamps `data-slot="status-strip-cell"` and `data-share` (`"no-data"`, `"none"`, `"some"`, or `"all"`).
- Both parts take `asChild`.

Docs: https://mantle.ngrok.com/components/data-display/status-strip
