---
"@ngrok/mantle": patch
---

Fix disabled `asChild` items in `Combobox`, `MultiSelect`, `Select`, `Command`, and `DropdownMenu`:

- A child's own `onClickCapture` does not run on a click.
- A middle click on a disabled `Combobox.Item` or `MultiSelect.Item` link does not open it in a new tab.
