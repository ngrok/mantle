---
"@ngrok/mantle": minor
---

`Combobox` no longer uses `@ariakit/react`. The `useListbox` hook that drives `Select` now drives `Combobox` too, with the WAI-ARIA editable combobox contract: DOM focus stays on the input, and `aria-activedescendant` names the highlighted item. Bundle size (gzip, React external): `Combobox` 53.4 KB → 16.1 KB. A page with `Select` and `Combobox` drops from 86.0 KB to 25.2 KB.

Breaking changes. Follow the [migration guide](https://mantle.ngrok.com/migrations/0018-combobox-owned-behavior-migration); `pnpm -w run migrate 0018` applies the prop renames and deletions, and reports each click opt-out that it cannot delete.

- Each part takes the props of its element plus a fixed set of its own, not every Ariakit prop.
- `Combobox.Root` uses mantle's selection names: `value` / `defaultValue` / `onValueChange` for the picked value, `inputValue` / `defaultInputValue` / `onInputValueChange` for the text, and `open` / `defaultOpen` / `onOpenChange`. Ariakit's `selectedValue` / `defaultSelectedValue` / `setSelectedValue`, `setValue`, and `setOpen` are gone, and `value` and `defaultValue` now set the picked value, not the text.
- `Combobox.Content` portals into the nearest overlay's positioner, or into `document.body`. It drops `unmountOnHide` and the Ariakit popover props, and keeps `sameWidth` and `asChild`.
- `Combobox.Item` drops `focusOnHover`, `hideOnClick`, `setValueOnClick`, and `selectValueOnClick`. A click writes the item's value into the input, picks it, and closes the list, unless `onClick` calls `event.preventDefault()`. The highlighted item carries `data-highlighted` in place of `data-active-item`.
- `Combobox.Input` drops `autoComplete`: it always uses list autocomplete. Its text moves to `inputValue` and `onInputValueChange` on `Combobox.Root`.
- `Combobox.ItemValue` drops `asChild` and `children`. Pass the text as `value`.

Other changes:

- The highlighted item has `aria-selected="true"`, as in the WAI-ARIA combobox pattern. No other item has the attribute.
- `Combobox.Root` takes `name`, `form`, `required`, and `disabled`. The picked value submits under `name` through a hidden input, a form reset returns the pick to `defaultValue` and the text to `defaultInputValue`, `required` blocks the submit until an item is picked, and `disabled` keeps the pick out of the form. With a root `name`, the typed text does not submit.
- The picked item carries `data-selected`, because `aria-selected` follows the highlight.
