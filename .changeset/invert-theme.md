---
"@ngrok/mantle": minor
---

feat(theme): add `invert-theme` — a first-class class that renders a DOM subtree in the opposite theme

Add the `invert-theme` class to any element and its subtree renders in the opposite theme of the page: light ⇄ dark and light-high-contrast ⇄ dark-high-contrast. The island is styled by the opposite theme's own definitions (each theme block's selector list also targets `.invert-theme` subtrees on its pair partner's pages), so every mantle component and color token inside just works — no conditional rendering, no per-component overrides.

- `MantleStyleSheets` now applies theme *pairs* together: the active theme's pair partner also gets `media="all"`, so inverted islands always have their opposite theme's CSS applied. `forceTheme` renders the forced theme's pair of link tags (`forceTheme="light"` now renders the dark link).
- `PowerBar`'s floating panel is now an `invert-theme` island: the bar, its buttons, its error alert, and any custom composed children all render inverted from the page theme in all four themes — matching the origin design.
- Documented on the Theme page, including the limitations: portaled floating content escapes the island (pass `invert-theme` to the floating part's `className`), theme-variant utilities (`dark:*`, …) keep page-theme semantics, nesting is idempotent, and shadows flip with the island (shadow tokens resolve at the consuming element, keeping the island's interior coherent).
