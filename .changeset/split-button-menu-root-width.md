---
"@ngrok/mantle": patch
---

Add `width="root"` to `SplitButton.MenuContent`. The menu then takes the width of the whole split button: the primary action and the menu trigger together. With `align="end"` (the default), the menu lines up with both edges of the split button. The menu follows the split button when its width changes, for example when the primary action's label changes.

`SplitButton.MenuContent` also takes `width="trigger"` and `width="content"`, as `DropdownMenu.Content` does. When you omit `width`, the menu keeps its intrinsic width.

`SplitButton.Root` is now as wide as its parts, also in a block container. Before, it stretched to the width of a block container, past its two buttons. The box draws nothing, so the page looks the same. To stretch `Root`, pass a width class such as `className="w-full"`.

See https://mantle.ngrok.com/components/actions/split-button#menu-width.
