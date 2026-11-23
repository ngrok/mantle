---
"@ngrok/mantle": patch
---

Fix two `Dialog`, `AlertDialog`, and `Sheet` bugs in Safari and Firefox:

- Safari: in a stack of modal dialogs, script focus could still reach a control in a dialog under the top one. The panel of each dialog under the top modal now takes `inert`.
- Firefox: a dialog that a key opens shows a focus ring on its first control again, also when its trigger got focus back from a dialog that a press opened.
