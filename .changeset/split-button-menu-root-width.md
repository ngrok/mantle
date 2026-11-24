---
"@ngrok/mantle": patch
---

`SplitButton.MenuContent` is now at least as wide as the whole split button: the primary action and the menu trigger together. When an item is wider, the menu grows to fit it. With `align="end"` (the default), a menu as wide as the split button lines up with both of its edges. The menu is never narrower than 8rem, and never wider than the viewport less 8px on each side. The menu is anchored to the split button, so it follows the split button's width while it is open. Before, the menu took the width of its widest item and lined up with the menu trigger.

`SplitButton.MenuContent` takes `width`: `"root"` (the default, as above), `"trigger"` (the width of the menu trigger), or `"content"` (the width of the widest item, as before). To keep the old menu, pass `width="content"`.

`SplitButton.Root` is now as wide as its parts, also in a block container. Before, it stretched to the width of a block container, past its two buttons. A split button whose parts fill the row, such as a `PrimaryAction` with `flex-1`, now hugs its content. To stretch `Root` as before, pass a width class such as `className="w-full"`.

See https://mantle.ngrok.com/components/actions/split-button#menu-width.
