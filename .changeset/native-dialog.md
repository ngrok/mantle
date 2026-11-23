---
"@ngrok/mantle": minor
---

`Dialog`, `AlertDialog`, `Sheet`, and the `Command` palette render the browser's modal `<dialog>` in place of Radix Dialog, and `@radix-ui/react-dialog` is no longer a dependency of mantle. The parts, their names, their props, and the look stay the same. The browser traps focus, makes the page inert, closes the dialog on Escape, paints it in the top layer, and returns focus to the trigger.

- The content mounts in the frame of the tap that opens it. On a mobile navigation sheet of about 150 elements at a 4× CPU slowdown, the open's Interaction to Next Paint drops from about 150 ms with Radix to about 115 ms.
- `forceMount` on `Content` keeps the content mounted and server-rendered while closed. An uncontrolled trigger then opens it with no React render, even before hydration.
- The exit animation plays in every browser: the dialog writes `data-state="closed"`, waits for the animations of the panel and the backdrop, and then closes.
- An open modal locks page scroll with a `data-mantle-scroll-lock` attribute on the root, not a `:root:has()` rule. Before this change, that rule made each change to the page slower, such as a tab switch, with no dialog open.
- Dialog, AlertDialog, and Sheet content scrolls with no overscroll bounce and no scroll chaining to the page.
- An open `Select`, `Combobox`, `MultiSelect`, or other popup with `aria-expanded` in the panel takes the first Escape.

Breaking changes:

- A modal dialog makes a frame that a script puts on `<body>` inert, such as a 3-D Secure challenge or a captcha. Set `modal={false}` on the `Root` of an overlay that holds one. A dialog that is not modal has no backdrop, paints at `z-60`, leaves the page live, and closes on Escape and a press outside, not on a focus move.
- The overlay elements are gone: no element carries `dialog-overlay`, `sheet-overlay`, or `alert-dialog-overlay`. Style `[data-slot~="dialog-positioner"]::backdrop` instead. `Dialog.Portal` and `Dialog.Overlay` are deprecated and do nothing.
- `role="dialog"` is on the `<dialog>` (`data-slot="dialog-positioner"`). The props of `Content` go to the panel inside it, which keeps `data-slot="dialog-content"`, `data-state`, and `data-mantle-modal-content`.
- `Content` takes no `asChild`: it renders the `<dialog>` and the panel inside it.
- The close completes after the exit animation, so a test waits for it.
- `overlay-prompt` UI outside the dialog takes no input while a modal is open, and `Sandbar` sits under the backdrop. `Toaster` moves its toasts into the open dialog.

Migration guide: https://mantle.ngrok.com/migrations/0027-native-dialog-migration
