---
"@ngrok/mantle": patch
---

Add an explicit type annotation to the `Select` compound namespace so `.d.ts` emit stays portable and does not break on `@types/react` upgrades (TS2883).
