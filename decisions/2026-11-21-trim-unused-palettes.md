# Remove unused palettes and theme duplication from mantle.css

**Date:** 2026-11-21
**Status:** Accepted
**Builds on:** [2026-11-21-typography-namespace-and-type-roles.md](./2026-11-21-typography-namespace-and-type-roles.md)

## Context

CSS blocks rendering, so each byte of `mantle.css` delays the first paint of every ngrok page. The theme rules of `mantle.css` restate each palette stop for the dark theme and for `invert-theme` islands, and they restate some tokens with the same value in both themes. An audit on 2026-11-21 read every class, `var()`, and raw `--token` string in mantle (`packages/mantle/src`), in each app and package of `ngrok-private/frontend`, and in the agent, ingress, flare-ui, and login apps and the shared packages of `ngrok-private/ngrok`. Of the 22 palettes in `mantle.css`, only `stone` has no use. Each other palette has used stops.

## Decision

1. **Remove a palette only when no code uses any of its stops.** Cody Price set the rule on 2026-11-21: keep every stop of a palette in use, and every stop of the semantic ramps (`accent`, `info`, `danger`, `warning`, `success`, `important`), even a stop such as `danger-300` that no code uses yet. Only `stone` meets the rule. `@theme` sets `--color-stone-*: initial`, so Tailwind makes no `stone` utility, and the dark theme and the island restore no longer declare it.
2. **Gray is an alias of neutral in both themes.** The light theme already aliased each gray stop to its neutral stop, and the dark theme declared the same literal for gray and neutral. `@theme static` now aliases `--color-gray-*` to `--color-neutral-*`, like `accent` to `sky`, and the `invert-theme` utility re-declares the aliases on islands. `static` keeps every alias on every page, as the light theme rule did, so a gray stop that only script reads keeps its value. No resolved color changes.
3. **A token with one expression in both themes is declared once.** The 41 tokens below had the same value in the light and the dark theme rules. One `:root, .invert-theme` rule declares them, so each theme and each island resolves them against its own ramps. No resolved color changes.
4. **The theme rules no longer declare `--divide-color-card` and `--divide-color-card-muted`.** `@theme inline reference` registers the `divide-card` utilities with `var(--border-color-card)` and `var(--border-color-card-muted)`, so nothing read the theme declarations.

## Alternatives considered

- **Remove each unused stop, such as `danger-300` or `cyan-50`.** Rejected by Cody Price on 2026-11-21. A ramp with gaps surprises design and the next caller, and `mantleThemePrunePlugin` already removes the dark value of an unused stop from a build.
- **`light-dark()` for each token.** Rejected: Google Analytics shows 2.34% of ngrok.com's users on browsers without it.
- **Remove the unused type-role steps and semantic surface tokens.** Not done: they live in `@theme`, so Tailwind emits them only when a build uses them, and they cost no bytes.

## Consequences

- Measured with Tailwind 4.3.5 and the files that `mantleSourcesPlugin` lists, a marketing page without an island drops from 113.9 KB to 102.2 KB minified (18.4 KB to 18.0 KB gzipped), and a product page from 172.2 KB to 160.4 KB. With `mantleThemePrunePlugin`, the marketing page drops from 92.8 KB to 90.6 KB.
- A `stone` class, such as `bg-stone-500`, no longer makes CSS. The [0017 migration guide](https://mantle.ngrok.com/migrations/0017-stone-palette-migration) gives the replacement.
- A consumer override can now win where it lost before. A later `:root { --border-color-card: red }` applies in every theme, also on a page with an explicit or forced theme, because no theme selector declares that token any more. A later `.invert-theme { … }` override applies on every island. An `@theme` override of `--color-gray-*` takes effect, because no unlayered light rule declares gray any more.
- `var(--divide-color-card)` and `var(--divide-color-card-muted)` resolve to nothing at runtime. The `divide-card` classes keep working, because they inline `var(--border-color-card)` and `var(--border-color-card-muted)`.
- To restore a palette or a declaration, copy its values from the catalog below into the same rules.

## Catalog of removed tokens

### `stone`

Light is Tailwind's default, which the light theme and the island restore used. Dark is the value of the dark theme rule.

| Token               | Light                        | Dark                         |
| ------------------- | ---------------------------- | ---------------------------- |
| `--color-stone-50`  | `oklch(98.5% 0.001 106.423)` | `oklch(14.7% 0.004 49.25)`   |
| `--color-stone-100` | `oklch(97% 0.001 106.424)`   | `oklch(21.6% 0.006 56.043)`  |
| `--color-stone-200` | `oklch(92.3% 0.003 48.717)`  | `oklch(26.8% 0.007 34.298)`  |
| `--color-stone-300` | `oklch(86.9% 0.005 56.366)`  | `oklch(37.4% 0.01 67.558)`   |
| `--color-stone-400` | `oklch(70.9% 0.01 56.259)`   | `oklch(44.4% 0.011 73.639)`  |
| `--color-stone-500` | `oklch(55.3% 0.013 58.071)`  | `oklch(55.3% 0.013 58.071)`  |
| `--color-stone-600` | `oklch(44.4% 0.011 73.639)`  | `oklch(70.9% 0.01 56.259)`   |
| `--color-stone-700` | `oklch(37.4% 0.01 67.558)`   | `oklch(86.9% 0.005 56.366)`  |
| `--color-stone-800` | `oklch(26.8% 0.007 34.298)`  | `oklch(92.3% 0.003 48.717)`  |
| `--color-stone-900` | `oklch(21.6% 0.006 56.043)`  | `oklch(97% 0.001 106.424)`   |
| `--color-stone-950` | `oklch(14.7% 0.004 49.25)`   | `oklch(98.5% 0.001 106.423)` |

### Theme declarations of `--divide-color-card`

| Token                       | Light                      | Dark                       |
| --------------------------- | -------------------------- | -------------------------- |
| `--divide-color-card`       | `var(--color-neutral-300)` | `var(--color-neutral-300)` |
| `--divide-color-card-muted` | `var(--color-neutral-200)` | `var(--color-neutral-200)` |

### Dark literals of `gray`, now aliases

Each dark value equals the dark `--color-neutral-*` stop, which the alias resolves to.

| Token              | Dark               |
| ------------------ | ------------------ |
| `--color-gray-50`  | `oklch(18.2% 0 0)` |
| `--color-gray-100` | `oklch(20.5% 0 0)` |
| `--color-gray-200` | `oklch(26.9% 0 0)` |
| `--color-gray-300` | `oklch(37.1% 0 0)` |
| `--color-gray-400` | `oklch(43.9% 0 0)` |
| `--color-gray-500` | `oklch(55.6% 0 0)` |
| `--color-gray-600` | `oklch(70.8% 0 0)` |
| `--color-gray-700` | `oklch(87% 0 0)`   |
| `--color-gray-800` | `oklch(92.2% 0 0)` |
| `--color-gray-900` | `oklch(97% 0 0)`   |
| `--color-gray-950` | `oklch(98.5% 0 0)` |

### Tokens moved to the shared rule

These keep their names and values. Only the rule that declares them changed: `--background-color-base`, `--background-color-base-hover`, `--background-color-form`, `--background-color-form-hover`, `--background-color-form-active`, `--border-color-base`, `--border-color-card`, `--border-color-popover`, `--border-color-dialog`, `--border-color-base-muted`, `--border-color-card-muted`, `--border-color-popover-muted`, `--border-color-dialog-muted`, `--border-color-form`, `--color-card-border`, `--color-card-border-muted`, `--color-active-menu-item`, `--color-selected-menu-item`, `--color-active-selected-menu-item`, `--color-chart-accent`, `--color-chart-danger`, `--color-chart-important`, `--color-chart-info`, `--color-chart-success`, `--color-chart-warning`, `--color-chart-decorative`, `--background-color-filled-accent`, `--background-color-filled-danger`, `--background-color-filled-warning`, `--background-color-filled-success`, `--background-color-filled-accent-hover`, `--background-color-filled-danger-hover`, `--background-color-filled-warning-hover`, `--background-color-filled-success-hover`, `--ring-color-focus-neutral`, `--ring-color-focus-accent`, `--ring-color-focus-danger`, `--ring-color-focus-warning`, `--ring-color-focus-success`, `--text-color-on-filled`, and `--shadow-color`.
