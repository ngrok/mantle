---
"@ngrok/mantle": minor
---

`Select` no longer uses `@radix-ui/react-select`. Mantle's own behavior hooks drive it, with the WAI-ARIA select-only combobox contract: DOM focus stays on the trigger, and `aria-activedescendant` names the highlighted option. Bundle size (gzip, React external): `Select` 43.2 KB → 18.5 KB.

Breaking changes. Follow the [migration guide](https://mantle.ngrok.com/migrations/0017-select-owned-behavior-migration); `pnpm -w run migrate 0017` deletes the positioning props.

- `Select.Content` takes no positioning props (`position`, `side`, `sideOffset`, `align`, and the other Radix Popper props) and no Radix event handlers (`onEscapeKeyDown`, `onPointerDownOutside`, `onCloseAutoFocus`). The list opens below the trigger, or above it when the space below is too small. `data-side` is `"top"` or `"bottom"`.
- The list stays modal: the page does not scroll and the rest of the page is inert while it is open. The page behind it uses `inert` in place of `aria-hidden`, so Tab cannot reach it either.
- The `--radix-select-*` CSS variables are gone. Use `--anchor-width`, `--anchor-height`, and `--available-height`.

Other changes:

- A server-rendered or prerendered select shows the selected item's text in its first paint. `Select.Value` reads it from the `Select.Item` elements until the items mount.
- `Select.Value asChild` merges the value's props onto your element.
- A value of `""` shows the placeholder.
- A form reset returns an uncontrolled select to `defaultValue`.
