---
"@ngrok/mantle": minor
---

`Combobox` no longer uses `@ariakit/react`. The `useListbox` hook that drives `Select` now drives `Combobox` too, with the WAI-ARIA editable combobox contract: DOM focus stays on the input, and `aria-activedescendant` names the highlighted item. Bundle size (gzip, React external): `Combobox` 53.4 KB → 16.1 KB. A page with `Select` and `Combobox` drops from 86.0 KB to 25.2 KB.

Breaking changes. Follow the [migration guide](https://mantle.ngrok.com/migrations/0018-combobox-owned-behavior-migration); `pnpm -w run migrate 0018` applies the prop renames and deletions.

- Each part takes the props of its element plus a fixed set of its own, not every Ariakit prop.
- `Combobox.Root` takes `inputValue`, `defaultInputValue`, and `setInputValue`. Ariakit's deprecated `value`, `defaultValue`, and `setValue` are gone.
- `Combobox.Content` portals into the nearest overlay's positioner, or into `document.body`. It drops `unmountOnHide` and the Ariakit popover props, and keeps `sameWidth` and `asChild`.
- `Combobox.Item` drops `focusOnHover`. The highlighted item carries `data-highlighted` in place of `data-active-item`.
- `Combobox.Input` drops `autoComplete`: it always uses list autocomplete.
- `Combobox.ItemValue` drops `asChild`.
