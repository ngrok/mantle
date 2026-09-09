---
"@ngrok/mantle": patch
---

`Dialog.Content`, `Sheet.Content`, and `AlertDialog.Content` now let Radix own `aria-describedby`. When you render a `Description` part, the content's `aria-describedby` points at that description as soon as the content opens. When you render none, the content carries no `aria-describedby`. Before this change, a mantle wrapper tracked the same presence in its own state and effect, so every root and every open paid for that work twice. An explicit `aria-describedby` on the content still wins.
