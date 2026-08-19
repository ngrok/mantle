---
"@ngrok/mantle": patch
---

`IconButton` and `PasswordInput`'s visibility toggle now carry their accessible name as `aria-label` instead of a visually hidden `<span>`. Voice-control tools (Rango, Voice Control, Voice Access) treat DOM text as a visible label, so they skipped these icon-only buttons. Screen readers announce `aria-label` the same way, so nothing changes for them.

`IconButtonProps` now rejects `aria-label` (typed `never`): the `label` prop is the single way to name the button. Components built on `IconButton` (`ThemeSwitcher.Trigger`, `Sidebar.Trigger`, `DataTable.RowExpandButton`, `CodeBlock.CopyButton`, and the chart copy buttons) inherit the fix.
