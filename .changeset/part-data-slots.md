---
"@ngrok/mantle": patch
---

More parts stamp a `data-slot`, so you can style or query them the same way as their siblings:

- `Popover.Trigger`, `Popover.Anchor`, and `Popover.Close`: `popover-trigger`, `popover-anchor`, and `popover-close`.
- `Sheet.Trigger` and `Sheet.Close`: `sheet-trigger` and `sheet-close`.
- `SplitButton.PrimaryAction`, `SplitButton.MenuTrigger`, `SplitButton.MenuContent`, and `SplitButton.MenuItem`: `split-button-primary-action`, `split-button-menu-trigger`, `split-button-menu-content`, and `split-button-menu-item`.
- `Field.Label` and `Field.HelpTrigger`: `field-label` and `field-help-trigger`.

Each slot joins in front of the slot of the part it wraps. For example, a `Popover.Trigger asChild` around a `Button` renders `data-slot="popover-trigger button"`. Match one slot with `[data-slot~="button"]`, not `[data-slot="button"]`.

`Field.Legend` and `List.Item` now join a `data-slot` that you pass in front of their own slot, instead of letting yours replace it.

`MultiSelect.Group` now merges your `className` with its default margin, as `Combobox.Group` does. Before, your `className` replaced the margin.

A part rendered outside its root now throws an error that names the root: `Alert`, `AlertDialog`, `DataTable`, and `CursorPagination.PageSizeSelect` and `CursorPagination.PageSizeValue`.
