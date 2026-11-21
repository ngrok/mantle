---
"@ngrok/mantle": patch
---

`IconButton` now accepts `children` only with `asChild`. Before, `<IconButton …>Copy text</IconButton>` type-checked, and the button dropped the children at runtime and rendered the `icon` alone. Now that call site is a type error. With `asChild`, the one child is still the element that renders.

`Alert.DismissIconButton`, `Dialog.CloseIconButton`, `Sheet.CloseIconButton`, `Field.HelpTrigger`, and `DataTable.RowExpandButton` take the same rule. `SplitButton.MenuTrigger` takes no `children`. The change is to types only: the runtime code and the bundle do not change.
