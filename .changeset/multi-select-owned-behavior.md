---
"@ngrok/mantle": minor
---

`MultiSelect` no longer uses `@ariakit/react`, and mantle drops the Ariakit dependency. The `useListbox` hook that drives `Select` and `Combobox` now drives `MultiSelect` too. The tags, `lockedValues`, the keyboard, and the hidden form inputs stay the same.

- Bundle size (gzip, React external): `MultiSelect` 57.2 KB → 18.9 KB.
- Memory and mount time, measured as the heap delta of 300 mounted instances in Node with happy-dom: `MultiSelect` 385 KB → 194 KB and 2.2 ms → 0.9 ms per instance; `Combobox` 261 KB → 77 KB and 1.4 ms → 0.3 ms. A closed `Combobox` or `MultiSelect` list now renders no items.

Breaking changes. Follow the [migration guide](https://mantle.ngrok.com/migrations/0019-multi-select-owned-behavior-migration); `pnpm -w run migrate 0019` applies the prop renames and deletions.

- Each part takes the props of its element plus a fixed set of its own, not every Ariakit prop.
- `MultiSelect.Root` takes `inputValue`, `defaultInputValue`, and `setInputValue`. Ariakit's deprecated `value`, `defaultValue`, and `setValue` are gone.
- The list is not modal. `MultiSelect.Content` drops `modal`, `backdrop`, `preventBodyScroll`, `portalElement`, `unmountOnHide`, and the other Ariakit popover props, and portals into the nearest overlay's positioner, or into `document.body`.
- `MultiSelect.Item` drops `focusOnHover`. The highlighted item carries `data-highlighted` in place of `data-active-item`.
