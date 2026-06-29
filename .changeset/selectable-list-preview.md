---
"@ngrok/mantle": minor
---

feat(mantle): add `SelectableList` preview component

`SelectableList` is a filterable, virtualized, multi-select list of checkbox
rows — the inline (non-popover) counterpart to `MultiSelect` / `Combobox`. Map
your data into `options` once; the list owns filtering, virtualization
(`@tanstack/react-virtual`), and selection. Each row is a fully-clickable real
checkbox with a title and an optional de-emphasized sub-line.

```tsx
import { SelectableList } from "@ngrok/mantle/selectable-list";

const options = accessKeys.map((key) => ({
	value: key.id,
	label: key.name,
	description: key.maskedToken,
}));

<SelectableList.Root options={options} value={selected} onValueChange={setSelected}>
	<SelectableList.Filter placeholder="Filter access keys…" />
	<SelectableList.SelectAll>Select all</SelectableList.SelectAll>
	<SelectableList.Viewport aria-label="Access keys" className="max-h-80" />
	<SelectableList.Empty>No access keys found.</SelectableList.Empty>
</SelectableList.Root>;
```

- **Composable rows.** The default title + description row is a convenience;
  pass a render-prop child to `SelectableList.Viewport` and compose
  `SelectableList.Item` / `ItemTitle` / `ItemDescription` to render your own
  layout. `options` stays the lightweight data layer (value + filter text +
  disabled) that virtualization and select-all need up front.
- Renders a `<ul role="list">` of `<li>` rows styled like the `MultiSelect`
  popover: a bordered, rounded `bg-popover` container whose rows highlight on
  hover / selection with an inset, rounded pill (accent-tinted when selected);
  rows support `disabled`.
- `SelectableList.SelectAll` reuses `selectAllChecked` to drive a tri-state
  header over the **filtered** options.
- Pure helpers `filterSelectableOptions`, `toggleSelectionValue`, and
  `summarizeSelection` are exported for custom filtering/selection logic.
- **Preview / unstable API.** Keyboard support is currently the native checkbox
  tab order within the rendered window; roving arrow-key navigation across the
  full virtualized list is a planned enhancement.
