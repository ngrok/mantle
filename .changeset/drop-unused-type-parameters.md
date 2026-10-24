---
"@ngrok/mantle": patch
---

`useUndoRedo` spells its constraint `T extends {}`, the type that `NonNullable<unknown>` resolves to. Calls compile as before.
