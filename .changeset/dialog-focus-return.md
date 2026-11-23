---
"@ngrok/mantle": patch
---

`Dialog`, `Sheet`, `AlertDialog`, and `Command.DialogRoot` now return focus on close to the element that had focus when the dialog opened. Before this change, a dialog that opened with no `Dialog.Trigger`, such as from a keyboard shortcut or from controlled state, left focus on `<body>`, and a dialog with a trigger always returned focus to the trigger. If the element that had focus is gone or cannot take focus, focus goes to the trigger as before. A consumer `onCloseAutoFocus` that calls `preventDefault()` still owns the focus.
