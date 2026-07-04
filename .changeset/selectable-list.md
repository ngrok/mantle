---
"@ngrok/mantle": minor
---

feat(mantle): add `SelectableList` component

`SelectableList` is a filterable, multi-select **grid** of checkbox rows — the
inline (non-popover) counterpart to `MultiSelect` / `Combobox`. Map your data
into `options` once; the list owns filtering and selection. Each row is an APG
grid `role="row"` (`aria-selected`) whose cells hold a real `Checkbox` and a
`Choice`-laid-out title + description — the pattern that lets a selectable row
carry a real control and its own interactive content.

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

- **Grid, not a checkbox-group.** `role="grid"` / `role="row"` / `role="gridcell"`
  with `aria-selected`, a real `Checkbox` in the selection cell, and the title as
  a `Choice.Label` naming it — the WAI-ARIA grid pattern for selectable rows with
  interactive content. The whole row is click-to-toggle (deferring to the
  checkbox, the label, and any nested control — no double-toggle).
- **Composable rows.** Default title + description row, or pass a render-prop
  child to a viewport and compose `SelectableList.Item` / `ItemTitle`
  (`Choice.Label`) / `ItemDescription` (`Choice.Description`).
- **Filtering.** The query is uncontrolled by default (seed it with
  `defaultQuery`) or controlled via `query`/`onQueryChange` on `Root`; pass
  `filter` for a custom predicate (`(option, query) => boolean` — the default
  is a trimmed, case-insensitive substring match over each option's `label`).
- **Disabled rows.** `options[].disabled` is the single source of truth —
  `SelectableList.Item` has no `disabled` prop. Disabled rows render dimmed,
  carry `aria-disabled`, are excluded from toggling and "select all", and are
  skipped by keyboard navigation.
- **Non-virtualized by default.** Swap `Viewport` → `VirtualViewport` (same props)
  to window long lists. `@tanstack/react-virtual` ships with every list
  entrypoint; it is small — a few kB gzipped — and does no windowing work until
  a `VirtualViewport` renders. Windowed rows carry `aria-rowindex` with
  `aria-rowcount` on the grid, keeping screen-reader counts true.
- `SelectableList.Empty` is an always-mounted polite `role="status"` live region
  (visually hidden while options match), so an emptied filter is announced
  rather than the grid silently vanishing.
- `SelectableList.SelectAll` reuses `selectAllChecked` to drive a tri-state header
  over the **filtered** options.
- Pure helpers `filterSelectableOptions`, `toggleSelectionValue`, and
  `summarizeSelection` are exported for custom filtering/selection logic.
- Built on a shared internal `list` primitive (scroll + row chrome and ARIA behind
  both list components).
- **Keyboard.** The grid is a single tab stop with `aria-activedescendant`
  navigation: `Arrow`/`Home`/`End` move the active row and `Space`/`Enter`
  toggles it. Because focus stays on the collection (never on a row), it works
  across the **full** set under `VirtualViewport` too — arrows scroll off-screen
  rows into view rather than stopping at the mounted window.
