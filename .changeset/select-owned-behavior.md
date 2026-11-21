---
"@ngrok/mantle": minor
---

`Select` no longer uses `@radix-ui/react-select`. Mantle's own behavior hooks drive it, with the WAI-ARIA select-only combobox contract: DOM focus stays on the trigger, and `aria-activedescendant` names the highlighted option. Bundle size (gzip, React external): `Select` 43.2 KB → 18.5 KB.

Breaking changes. Follow the [migration guide](https://mantle.ngrok.com/migrations/0017-select-owned-behavior-migration); `pnpm -w run migrate 0017` deletes the positioning props.

- `Select.Content` takes no positioning props (`position`, `side`, `sideOffset`, `align`, and the other Radix Popper props) and no Radix event handlers (`onEscapeKeyDown`, `onPointerDownOutside`, `onCloseAutoFocus`). The list opens below the trigger, or above it when the space below is too small. `data-side` is `"top"` or `"bottom"`.
- The list is not modal. The page keeps scrolling while it is open, and the rest of the page keeps its accessibility tree.
- The `--radix-select-*` CSS variables are gone. Use `--anchor-width`, `--anchor-height`, and `--available-height`.

Other changes:

- `Select.Value asChild` merges the value's props onto your element.
- A value of `""` shows the placeholder.
- A form reset returns an uncontrolled select to `defaultValue`.
