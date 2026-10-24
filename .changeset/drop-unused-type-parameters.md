---
"@ngrok/mantle": patch
---

`buildCrumbs` takes `ReadonlyArray<BreadcrumbMatch>` in place of an unused type parameter, and `useUndoRedo` spells its constraint `T extends {}`. Calls without an explicit type argument compile as before. A call that passes an explicit type argument to `buildCrumbs` removes it.
