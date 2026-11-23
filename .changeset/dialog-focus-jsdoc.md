---
"@ngrok/mantle": patch
---

Correct the JSDoc of `Dialog`, `AlertDialog`, `Sheet`, and `Sidebar`: the browser makes the page behind a modal dialog inert, and Tab can move from the dialog to the browser UI. It does not trap focus in the dialog.
