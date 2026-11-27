---
"@ngrok/mantle": patch
---

Add `closedby` to `Sheet.Content` and `Dialog.Content`, after the HTML `closedby` attribute of `<dialog>`. With `closedby="closerequest"`, a press outside the panel does not close the sheet or dialog, and `onPointerDownOutside` and `onInteractOutside` do not run. Escape and the close parts still close it. Use it on a sheet with `modal={false}` that holds a card form, so a stray click or a press on a password manager's menu does not lose the input. The [native dialog migration guide](https://mantle.ngrok.com/migrations/0027-native-dialog-migration) now covers it. The default, `"any"`, keeps the current behavior.
