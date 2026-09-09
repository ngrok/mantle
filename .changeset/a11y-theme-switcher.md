---
"@ngrok/mantle": patch
---

`ThemeDropdownMenuRadioGroup` now names its `role="group"`: "Theme" by default, `aria-label` to rename it, or `aria-labelledby` to point at a visible heading. Before this change the group had no name. The pre-hydration `Skeleton` inside `ThemeSwitcher.Trigger` renders as a `<span>`, so the server HTML no longer puts a `<div>` inside a `<button>`. The `ThemeSwitcher.Trigger` and `ThemeSwitcher.Content` summaries in the built types now match their declarations.
