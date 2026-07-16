---
"@ngrok/mantle": patch
---

Restore the bottom rule on the horizontal classic `Tabs.List`, defaulting to the `separator` color token. The rule terminates at the ends of the tab triggers instead of running the full container width (the list now sizes `w-fit`, capped at the container, and the rule is painted on the list's content box so the focus-ring breathing padding doesn't widen it), and it sits just below the active trigger's decoration. Recolor it via the `--tabs-list-border-color` CSS variable, or set it to `transparent` to hide it. Pill-appearance tabs never draw the rule. The vertical classic tablist side rule also uses the `separator` token now (previously `gray-200`).

Migration notes:

- If you worked around the missing rule by adding your own `border-b` to `Tabs.List`, remove it — otherwise you'll render a doubled, two-tone rule that stops at the last trigger.
- If your `Tabs.List` layout relied on the list spanning its container (e.g. `grid grid-cols-4` or a full-width custom border), add an explicit width class such as `w-full` to your `className` — the classic horizontal list now hugs its triggers by default.
