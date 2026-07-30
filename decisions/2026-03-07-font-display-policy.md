# Mantle Font Display Policy

## Status

- [x] Proposed
- [x] Accepted
- [x] Implemented 2026-03-07
- [ ] Superseded

## Decision Drivers

- Lighthouse flagged `font-display` behavior, especially for italic faces
- Previous testing showed `family` was the main source of Cumulative Layout Shift (CLS) with `swap`
- Italic faces are non-critical and should not compete for startup budget

## Decision

Set per-face `font-display` values in Mantle's `@font-face` declarations:

| Font                      | `font-display` | Rationale                                                         |
| ------------------------- | -------------- | ----------------------------------------------------------------- |
| `roobert`                 | `swap`         | Used above the fold; preloaded, so swap is safe                   |
| `jetbrains-mono` (normal) | `swap`         | Used above the fold; preloaded, so swap is safe                   |
| `family-regular`          | `fallback`     | `family` was observed to cause CLS with `swap`; keep conservative |
| `jetbrains-mono-italic`   | `optional`     | Non-critical; should not force late swaps or fight startup budget |
| `family-italic`           | `optional`     | Non-critical; should not force late swaps or fight startup budget |

## Alternatives Considered

### `swap` for all faces

- **Pros**: Consistent, simple rule
- **Cons**: `family` caused measurable CLS in previous testing; italic faces are non-critical and not worth the swap penalty

### `fallback` for all faces (status quo)

- **Pros**: Conservative, no CLS risk
- **Cons**: Lighthouse flags the behavior for above-the-fold fonts that are preloaded; `fallback` undersells fonts that will reliably load in time

### `optional` for all faces

- **Pros**: Best performance; never causes layout shift
- **Cons**: Too aggressive for primary fonts — risks invisible text on slow connections even when fonts are preloaded

## Consequences

### Positive

- Lighthouse scores improve for font-display warnings on primary faces
- Italic faces no longer compete for network budget at startup
- `family-regular` CLS risk is preserved as conservative `fallback`

### Negative

- Slightly more complex rule set (three different values) instead of a single uniform policy
