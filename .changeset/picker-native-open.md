---
"@ngrok/mantle": patch
---

`Select`, `Combobox`, and `MultiSelect` open faster and behave like a native select. The parts and their nesting do not change.

- `Select` and `MultiSelect` are no longer modal, the same as a native select and `Combobox`. While the list is open, the page scrolls and stays reachable to assistive technology: no `inert` on the rest of the page and no scroll lock on `<html>`. Focus stays on the trigger or input, Tab stays held, Escape closes the list, and a primary press outside closes the list without its click reaching the page. In `MultiSelect`, Shift+Tab from the first control in the list goes back to the input.
- `Select.Content`, `Combobox.Content`, and `MultiSelect.Content` are `popover="manual"` elements in the top layer, so an open list paints above the page and every overlay. They portal into the overlay or float that holds them, else into `document.body`. A browser with no popover API shows a fixed box at `z-50`, as before. The wrapper `<div>` around each list is gone.
- The lists use the native float placement that `Popover` uses, from script. A list that fits on neither side opens on the side with more room, as before. In a right-to-left document, a list now lines up with the trigger's right edge, as `Popover` does.
- The open list writes each option's `data-highlighted` (and, in `Combobox`, `aria-selected`) itself, so opening the list and moving the highlight with the keyboard or the pointer re-render no option. An open needs no `flushSync`. The highlighted option scrolls into view inside the list only, never the page.
- An open list that an overlay covers, such as a controlled picker left open under a dialog that does not hold it, waits until that overlay closes, as `Popover` does. The top layer would otherwise paint it over the dialog.
