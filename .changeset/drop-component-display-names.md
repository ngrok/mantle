---
"@ngrok/mantle": patch
---

Remove all `Component.displayName = "..."` assignments. Bundlers (verified with Vite 8 / Rolldown) treat these top-level property assignments as side effects, which pins otherwise-unused components — and their dependencies — into consumer bundles. Dropping them lets dead components tree-shake correctly; e.g. a dialog-only bundle no longer retains the unused Toast components. React DevTools falls back to inferring names from the component function names.
