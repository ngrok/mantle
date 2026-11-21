---
"@ngrok/mantle": minor
---

Add `@ngrok/mantle/dialog/native` and `@ngrok/mantle/sheet/native`: `Dialog` and `Sheet` on the browser's modal `<dialog>`. Each one exports the same parts as its sibling, with the same look, so a swap is an import change:

```tsx
import { Sheet } from "@ngrok/mantle/sheet/native";
```

The browser traps focus, makes the page inert, closes the dialog on Escape, paints it in the top layer, and returns focus to the trigger. An uncontrolled tap opens it with a DOM call and no React render, so the open answers in the next frame on a slow phone. On a mobile navigation sheet of about 150 elements at a 4× CPU throttle, the tap that opens the native sheet measures under 100ms of Interaction to Next Paint, with no long frame after it.

Know the trade-offs before you swap:

- The server renders the content and the page hydrates it, open or not. Opening costs almost nothing, but the page pays more HTML and more hydration at load.
- Floats inside (`Popover`, `Select`, `MultiSelect`, `DropdownMenu`, `Tooltip`, `HoverCard`, `AlertDialog`) portal into the `<dialog>`. Escape closes the innermost one first. Toasts move into the open dialog.
- A frame that a third-party script puts on `<body>`, such as a captcha or a payment challenge, is inert under the dialog. Keep `@ngrok/mantle/dialog` or `@ngrok/mantle/sheet` for a form that embeds one.
- A controlled `open` works, but each change renders React. The fast path is the uncontrolled trigger.
- The exit animates in Chromium only. Other browsers close at once.
- CSS locks page scroll (`:root:has(dialog:modal)`), not a script.
- `Dialog.Portal` renders its children and `Dialog.Overlay` renders nothing. `Content` takes none of the Radix event props: use a controlled `open` to keep the dialog open on Escape or on a backdrop click.

The trigger carries `aria-expanded` and `data-state="open" | "closed"`, and the panel (`data-slot="dialog-content"` or `"sheet-content"`) carries `data-state` and `data-mantle-modal-content`, as on the Radix siblings. The `<dialog>` takes the `dialog-positioner` or `sheet-positioner` slot.

`@ngrok/mantle/dialog` and `@ngrok/mantle/sheet` now share their class recipes and their plain parts (`Header`, `Body`, `Footer`, `TitleGroup`, `Actions`, and the look of `CloseIconButton`) with the native subpaths. They render the same markup as before.

Docs: https://mantle.ngrok.com/components/overlays/dialog#native-dialog and https://mantle.ngrok.com/components/overlays/sheet#native-sheet
