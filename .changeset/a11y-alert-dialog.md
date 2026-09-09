---
"@ngrok/mantle": patch
---

`AlertDialog.Content` now carries `role="alertdialog"`, and a pointer interaction outside the content no longer closes the dialog. The docs already promised that the user must acknowledge an alert dialog; before this change the content had `role="dialog"` and a click on the backdrop dismissed it. Escape, `AlertDialog.Cancel`, and `AlertDialog.Close` still close it. Your `onInteractOutside` handler still runs; the content calls `event.preventDefault()` after it.

The `AlertDialog.Icon` JSDoc and docs now describe its real props (`svg` on an `<svg>` element, no `asChild`), and every namespace member's JSDoc summary matches its part.
