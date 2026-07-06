# List-family API design: two components, a private primitive, standards-first naming

**Date:** 2026-07-04
**Status:** Accepted
**Applies to:** `@ngrok/mantle/list`, `@ngrok/mantle/selectable-list`, `packages/mantle/src/components/list/primitive.tsx`
**Distilled rules:** [CONVENTIONS.md → Component API Design](../CONVENTIONS.md#component-api-design)

## Context

The list family originally shipped as **three public components** — a low-level
`List` primitive (`Root`/`VirtualRoot`/`Row`, with a `semantics="list" | "grid"`
switch), `ScrollableList` (clickable rows), and `SelectableList` (multi-select
checkbox grid). A design review over several sessions collapsed and reshaped
that surface. This record captures the decisions and the reasoning, so future
components start from these conclusions instead of re-deriving them in review.

## Decisions

### 1. Two public components; the primitive is private

`List` (action/navigation items) and `SelectableList` (multi-select grid) are
the public API. The shared primitive (`list/primitive.tsx` + `list/virtual.tsx`)
is imported by relative path, absent from `package.json` exports, and
undocumented — mirroring `dialog/primitive`.

- Three components imposed a decision tax ("which list do I use?"), and the
  primitive's docs page mostly told readers not to use it — the tell that it
  shouldn't have been public.
- "ScrollableList" was a weak name (every list scrolls); its real identity was
  simply _the list component_, so it took the `List` name when the family
  collapsed.
- The asymmetry that decided it: **promoting a private primitive later is
  additive and non-breaking; un-shipping a public one is breaking.** Ship the
  smaller surface while it's free.
- Contrast with `Table`/`DataTable`, where `DataTable` builds on the **public**
  `Table`. Both shapes are legitimate; the fork is whether the lower layer is a
  complete, usable component in its own right (`Table` is) or scaffolding that
  only exists to back siblings (the list primitive).

### 2. The ARIA mode switch is an implementation detail

The primitive's `semantics="list" | "grid"` prop is not public API. `List`
hardwires `role="list"`; `SelectableList` hardwires the APG grid. Consumers
never choose an ARIA mode.

Why not "just use grid everywhere" (considered, rejected): the
no-interactive-content restriction people fear belongs to **`listbox`**, not
`list` — a plain list's items may host any number of controls, each a real tab
stop. Grid-for-everything would cost: table-style screen-reader announcements
("grid, 40 rows", row/column coordinates) for what is visually a column of
links; mandatory `role="gridcell"` wrappers; and the loss of per-item tab stops
that short link lists are expected to have. Grid is _required_ on the selection
side because `aria-selected` is invalid on `listitem` and `listbox` forbids
real controls — the only conforming role left is `row`, which drags in grid,
which then pays for itself via the single tab stop and virtualization-proof
`aria-activedescendant` focus.

### 3. Standards-first naming: `Item`, not `Row`

The primitive's unit was renamed `Row` → `Item`: a component named **List**
contains items (`<li>` is literally "list item"; `role="listitem"` is the
default semantics) — the same rule that makes `Table.Row` right (`<tr>`,
`role="row"`). The rename went all the way through (props `itemId` /
`isItemDisabled` / `estimateItemHeight`, slots, types, internals); "row"
survives only as grid-mode ARIA vocabulary (`role="row"`, `aria-rowindex`,
`aria-rowcount`), where it is the standards term. A half-renamed API
(`List.Item` configured by `rowId`) is worse than either name.

Two follow-on naming rules landed the same way:

- Every compound's outermost part is `Root` (`List.Root` / `List.VirtualRoot`,
  not `Viewport`), even though `List` has no separate state owner — global
  consistency across mantle compounds beats local cross-component symmetry.
- Props read as the ARIA they emit: `List.Item`'s accent prop is `current`
  (it sets `aria-current`; `aria-selected` is invalid on listitems and
  selection is `SelectableList`'s job).

### 4. `SelectableList` is data-driven; `List` is composition-based

`SelectableList` takes `options` (the DataTable pattern) because its value-add
— filtering, select-all, selection-by-value, virtualization — is
collection-level logic that must operate over items that may not be mounted or
even created. Registration models (cmdk) can't see unmounted items;
children-prop sniffing only sees the outermost composed element and fails
silently when consumers wrap items (a `cloneElement`-injection bug this family
actually had and removed). Rendering stays composable via the viewport
render-prop. `List` stays fully children-based because everything it does
derives from the children it is handed.

The general rule: **membership is data when collection-level behavior outlives
mounting; presentation is always composition.** And never smuggle collection
facts through element props — the primitive exposes index-based callbacks
(`isItemDisabled`, `itemId`, `onActivate`) instead.

### 5. Rich labels via a type-level contract

`SelectableListOption.label` is a `ReactNode`; the option type is a union that
requires `labelText: string` (the default filter's match target) exactly when
`label` isn't a string. Misuse is a compile error instead of a filter that
silently stops matching at runtime. Deriving text from the ReactNode (tree
walking) was rejected as fragile and expensive; `labelText` was chosen over
Radix's `textValue` (collides semantically with `value`) and over cmdk-style
`keywords: string[]` (a semantics change — kept open as a possible _additive_
alias prop later).

## Consequences

- Adding a third list flavor later means either a new prop/part on an existing
  component or promoting the primitive — both additive.
- The primitive's internals (`ListPrimitive*` displayNames, `ListShell` /
  `useListShell`) may change freely; only `List` and `SelectableList` are
  contracts.
- These conclusions are encoded as active rules in
  [CONVENTIONS.md → Component API Design](../CONVENTIONS.md#component-api-design)
  and gate new-component scaffolding.
