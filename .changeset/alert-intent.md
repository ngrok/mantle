---
"@ngrok/mantle": minor
---

**Breaking:** `Alert.Root`'s `priority` prop is renamed to `intent` (still required; the value union is unchanged: `danger | important | info | success | warning`). The rename is mechanical: `<Alert.Root priority="warning">` becomes `<Alert.Root intent="warning">`. See the migration guide at https://mantle.ngrok.com/migrations/priority-to-intent-migration.
