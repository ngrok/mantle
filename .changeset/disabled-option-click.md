---
"@ngrok/mantle": patch
---

Fix disabled items in `Combobox`, `MultiSelect`, `Select`, `Command`, and `DropdownMenu` so a click runs no click handler, as on a disabled button. This covers a handler on an `asChild` child and on a function child's element, and an `asChild` link does not navigate. A `Combobox.Item` with no `value` is disabled, so it also ignores a click.

- A scripted or assistive click on a disabled `Select.Item` no longer blanks the trigger label.
- Disabled `Combobox.Item` and `MultiSelect.Item` rows show the default cursor.
- Disabled `Select.Item` and `Command.Item` rows no longer set `pointer-events: none`, so a `title` or other hover hint on a disabled row works.
