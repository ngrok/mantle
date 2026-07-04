---
"@ngrok/mantle": minor
---

feat(mantle): publish the `List` primitive as `@ngrok/mantle/list`

`List` is the low-level scroll + row primitive that already backs
`ScrollableList` and `SelectableList` — now exported as its own subpath for
consumers who need the shared viewport / row chrome and ARIA wiring with their
own state and layout. Compose `List.Row` children under a `List.Root` (or the
windowed `List.VirtualRoot`); `semantics` chooses the ARIA shape.

```tsx
import { List } from "@ngrok/mantle/list";

<List.Root semantics="list" aria-label="Environments" className="max-h-80">
	{environments.map((environment) => (
		<List.Row key={environment.id} selected={environment.id === activeId}>
			<button type="button" onClick={() => setActiveId(environment.id)}>
				{environment.name}
			</button>
		</List.Row>
	))}
</List.Root>;
```

- **`semantics="list"`** renders a `role="list"` of `role="listitem"` rows
  (native tab order, with `Arrow`↑/`Arrow`↓ / `Home` / `End` moving focus
  between the rows' controls, skipping `disabled` rows; the focused row tints
  like hover instead of ringing the control); **`semantics="grid"`** renders a
  `role="grid"` of
  `aria-selected` `role="row"`s driven as a single tab stop with
  `aria-activedescendant` navigation that survives virtualization. Grid
  keyboard navigation skips `disabled` rows (which carry `aria-disabled`),
  `Space` / `Enter` or a bare click on a row fires `onActivate` (deferring to
  nested interactive content that handles its own click), pressing or clicking
  a row makes it the active row, and keys from a focused nested tabbable
  control (a link, an overflow-menu button) are handled by that control, not
  the grid. Disabled state defaults to each row element's `disabled` prop; pass
  `isRowDisabled` to drive it from your data instead. Windowed `list` rows
  carry `aria-posinset`/`aria-setsize`; windowed `grid` rows carry
  `aria-rowindex` with `aria-rowcount` on the grid.
- **`List.Row`** owns the hover / `selected` pill chrome and supports `asChild`
  (e.g. render it as an `<a>` for a navigation row).
- **`List.VirtualRoot`** is a drop-in for `List.Root` that windows the same
  `Row` children via `@tanstack/react-virtual`. The dependency ships with every
  list entrypoint (the `List` namespace re-exports `VirtualRoot`); it is small —
  a few kB gzipped — and does no windowing work until a `VirtualRoot` renders.
- Most lists still want `ScrollableList` (action / navigation) or
  `SelectableList` (multi-select checkbox grid), which layer data, filtering,
  and selection on top of this primitive.
