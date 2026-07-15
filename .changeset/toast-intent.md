---
"@ngrok/mantle": minor
---

**Breaking:** `Toast.Root`'s `priority` prop is renamed to `intent` (still required; the value union is unchanged: `danger | info | success | warning`), and the public type exported from `@ngrok/mantle/toast` is renamed from `Priority` to `ToastIntent`. See the migration guide at https://mantle.ngrok.com/migrations/priority-to-intent-migration.
