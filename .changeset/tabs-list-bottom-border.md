---
"@ngrok/mantle": patch
---

Restore the classic `Tabs.List` border, drawn by default in the `separator` color token: horizontal tablists draw a 1px bottom border and vertical tablists draw the matching side border (also the `separator` token now, previously `gray-200`). The border is painted on the list's content box so the focus-ring breathing padding doesn't push it past the container edges, it sits just below the active trigger's decoration, and it stays solid to the container edges while scrolled triggers fade under the scroll-fade mask.

Pass the new `hideBorder` prop on `Tabs.List` to remove the border; it is also rendered as a `data-hide-border` attribute on the tablist element. The pill appearance never draws a border, so `hideBorder` has no effect there. `Tabs.Root` now renders a `data-appearance` attribute for appearance-scoped styling.

If you previously worked around the missing border by adding your own `border-b` to `Tabs.List`, remove it — otherwise you'll render a doubled, two-tone border.
