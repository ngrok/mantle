---
"@ngrok/mantle": patch
---

`Checkbox` takes `onCheckedChange(checked)`, in line with `Switch` and `DropdownMenu.CheckboxItem`. It runs with the new checked state after the native `onChange`. A click on an indeterminate box passes `true`.
