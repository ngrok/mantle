---
"@ngrok/mantle": minor
---

`Select` no longer uses `@radix-ui/react-select`. Mantle's own behavior hooks drive it, with the WAI-ARIA select-only combobox contract: DOM focus stays on the trigger, and `aria-activedescendant` names the highlighted option. Bundle size (gzip, React external): `Select` 43.2 KB → 19.5 KB. Memory and mount time, measured as the heap delta of 300 mounted instances in Node with happy-dom: 1.33 MB → 150 KB and 9.0 ms → 1.2 ms per instance. A closed list now renders no items.

Breaking changes. Follow the [migration guide](https://mantle.ngrok.com/migrations/0017-select-owned-behavior-migration); `pnpm -w run migrate 0017` deletes the positioning props.

- `Select.Content` takes no positioning props (`position`, `side`, `sideOffset`, `align`, and the other Radix Popper props) and no Radix event handlers (`onEscapeKeyDown`, `onPointerDownOutside`, `onCloseAutoFocus`). The list opens below the trigger, or above it when the space below is too small. `data-side` is `"top"` or `"bottom"`.
- The list is not modal, the same as a native select. Tab does not move focus out of an open list.
- The `--radix-select-*` CSS variables are gone. Use `--anchor-width`, `--anchor-height`, and `--available-height`.

Other changes:

- A server-rendered or prerendered select shows the selected item's text in its first paint. `Select.Value` reads it from the `Select.Item` elements while the list is closed.
- `Select.Value asChild` merges the value's props onto your element.
- A value of `""` shows the placeholder.
- A form reset returns a select to `defaultValue`, or to no value when it has none, with or without a `name`.
- A `required` select blocks its form until it has a value, with or without a `name`.
