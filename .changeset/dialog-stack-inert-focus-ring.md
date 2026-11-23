---
"@ngrok/mantle": patch
---

Fix three `Dialog`, `AlertDialog`, and `Sheet` bugs in Safari, Firefox, and jsdom:

- Safari: in a stack of modal dialogs, script focus could still reach a control in a dialog under the top one. The panel of each dialog under the top modal now takes `inert`.
- Firefox: a dialog that a key opens shows a focus ring on its first control again, also when its trigger got focus back from a dialog that a press opened.
- jsdom: a dialog opens and closes again in a test that clicks its trigger. jsdom has no `showModal()`, `show()`, or `close()`, so the dialog now sets and removes the `open` attribute when they are missing.
