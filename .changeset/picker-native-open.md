---
"@ngrok/mantle": patch
---

`Select`, `Combobox`, and `MultiSelect` open faster. The parts and their nesting do not change.

- `Select.Content`, `Combobox.Content`, and `MultiSelect.Content` are `popover="manual"` elements in the top layer, so an open list paints above the page and every overlay. They portal into the overlay or float that holds them, else into `document.body`. A browser with no popover API shows a fixed box at `z-50`, as before. The wrapper `<div>` around each list is gone.
- The lists use the native float placement that `Popover` uses, from script. A list that fits on neither side opens on the side with more room, as before.
- An open to the selected option highlights it in the commit that opens the list, with no `flushSync`. The highlighted option scrolls into view inside the list only, never the page.
