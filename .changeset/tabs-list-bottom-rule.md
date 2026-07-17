---
"@ngrok/mantle": patch
---

Restore the bottom border on the horizontal classic `Tabs.List`, drawn by default in the `separator` color token. The border terminates at the ends of the tab triggers instead of running the full container width (the list sizes `w-fit`, capped at the container, and the border is painted on the list's content box so the focus-ring breathing padding doesn't widen it), and it sits just below the active trigger's decoration. Pass the new `hideBorder` prop on `Tabs.List` to remove it — it removes the vertical classic side border the same way and is also rendered as a `data-hide-border` attribute on the tablist element. The pill appearance never draws a border, so `hideBorder` has no effect there. Also: `Tabs.Root` renders a `data-appearance` attribute for appearance-scoped styling, and the vertical classic side border uses the `separator` token (previously `gray-200`).

Migration notes:

- If you worked around the missing border by adding your own `border-b` to `Tabs.List`, remove it — otherwise you'll render a doubled, two-tone border.
- If your `Tabs.List` layout relied on the list spanning its container (e.g. `grid grid-cols-4`), add an explicit width class such as `w-full` to your `className` — the classic horizontal list now hugs its triggers.
