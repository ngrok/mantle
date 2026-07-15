---
"@ngrok/mantle": minor
---

**Breaking:** `AlertDialog.Root`'s `priority` prop is renamed to `intent` (still required; the value union is unchanged: `info | danger`). `AlertDialog.Action` still derives its button tone from the dialog's intent — `danger` → a danger button, otherwise a **neutral** button (the system's default primary action; previously the old "default"/accent tone) — and `AlertDialog.Action`/`AlertDialog.Cancel` keep `appearance` and `intent` optional (their wrapper defaults are the design; a consumer-passed value still wins). Call sites that passed `priority` to `Action` rename it to `intent`. See the migration guide at https://mantle.ngrok.com/migrations/priority-to-intent-migration.
