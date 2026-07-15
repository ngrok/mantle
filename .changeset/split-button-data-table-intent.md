---
"@ngrok/mantle": minor
---

**Breaking (pass-through surfaces):** `SplitButton.PrimaryAction` now omits `intent` instead of `priority` from its forwarded Button props (it still renders outlined + neutral; it never accepted the tone prop). `DataTable.HeaderSortButton` and `DataTable.RowExpandButton` forward the renamed props: call sites that passed `priority` to `HeaderSortButton` rename it to `intent` (`appearance`/`intent` stay optional on both, defaulting to their current ghost + neutral rendering). See the migration guide at https://mantle.ngrok.com/migrations/priority-to-intent-migration.
