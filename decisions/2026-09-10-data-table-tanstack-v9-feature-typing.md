# DataTable parts are generic over TanStack Table v9 features

**Date:** 2026-09-10
**Status:** Accepted
**Applies to:** `@ngrok/mantle/data-table`, and every future part that takes a TanStack Table v9 `Table`, `Column`, `Row`, or `Cell` as a prop
**Evidence:** `@tanstack/react-table` 9.2.4 and `@tanstack/table-core` 9.2.4, read on 2026-09-10
**Migration guide:** [mantle.ngrok.com/migrations/data-table-tanstack-v9-migration](https://mantle.ngrok.com/migrations/data-table-tanstack-v9-migration)

## Context

TanStack Table v8 had one shape per object: `Table<TData>`, `Column<TData, TValue>`, `Row<TData>`. Every
feature was always on, so every method was always there. `DataTable` typed its props against those shapes and
called `row.getVisibleCells()`, `row.getIsExpanded()`, and `column.getIsSorted()` with no guard.

v9 registers features per table. `tableFeatures({ rowSortingFeature, sortedRowModel: createSortedRowModel(), sortFns: { … } })`
builds a `features` object, `useTable({ features, data, columns })` consumes it, and every table type gains a
leading `TFeatures` parameter: `Table<TFeatures, TData>`, `Column<TFeatures, TData, TValue>`,
`Row<TFeatures, TData>`. A feature's methods exist on an instance only when the table registers that feature,
and the types say so.

Three facts about those types decided the API. We read each one from the 9.2.4 declarations on 2026-09-10 and
checked it with a probe file under `packages/mantle/src/components/data-table/`, deleted after the run.

### Fact 1: `TFeatures` is invariant

`Table_Core`, `Column_Core`, `Row_Core`, and every feature interface declare the parameter as
`in out TFeatures` (`@tanstack/table-core/dist/types/Table.d.ts:34`, `types/Column.d.ts:18`,
`types/Row.d.ts:13`). A `Table<typeof features, TData>` is not assignable to `Table<StockFeatures, TData>`,
`Table<CoreFeatures, TData>`, or `Table<TableFeatures, TData>`, and none of those is assignable back. The
probe produced six `TS2322` errors, one per direction per target.

### Fact 2: a feature method does not resolve while `TFeatures` is generic

`Column<TFeatures, TData, TValue>` is `Column_Core<…> & ExtractFeatureMapTypes<TFeatures, Column_FeatureMap<…>>`,
and `ExtractFeatureMapTypes` is a conditional type (`types/TableFeatures.d.ts`). Inside a generic function the
conditional stays deferred, so TypeScript resolves a property access against the union of both branches. The
constraint `TFeatures extends Pick<StockFeatures, "rowSortingFeature">` does not change that.
The probe reported:

```
error TS2339: Property 'getIsSorted' does not exist on type
  'Column_Core<TFeatures, TData, TValue> | (Column_Core<TFeatures, TData, TValue> & Column_ColumnFaceting<TFeatures, TData> & ... 9 more ... & Column_RowSorting<...>)'.
```

`Row<TFeatures, TData>` fails the same way for `getIsExpanded`.

### Fact 3: `TableFeatures` claims every feature

`TableFeatures` extends `Partial<CoreFeatures>`, `Partial<StockFeatures>`, and `Partial<Plugins>`, so
`keyof TableFeatures` is every feature key, and `ExtractFeatureMapTypes<TableFeatures, …>` intersects every
feature API. `Row<TableFeatures, Data>` typechecks `row.getIsExpanded()`, `row.getVisibleCells()`,
`row.getIsSelected()`, and `row.getIsGrouped()` in one expression; the probe raised no error. At runtime, each
call throws `TypeError` on a table that did not register the feature.

## Decisions

### 1. Every part is generic over `TFeatures`

`Root`, `Header`, `HeaderSortButton`, `Row`, `RowExpandButton`, `ExpandedRow`, and `expandedRowId` each take a
`TFeatures extends TableFeatures` parameter and type their `table`, `column`, or `row` prop with it. A consumer
never writes it: `useTable` infers it from `features`, and `props.column` and `props.row` inside a column
definition already carry it.

Alternatives:

- A fixed `Table<StockFeatures, TData>` and `Column<StockFeatures, TData, TValue>`. Rejected: Fact 1. Nothing a
  consumer builds with `tableFeatures({ … })` is assignable to it.
- A fixed `Table<TableFeatures, TData>`. Rejected: Fact 1 again, and Fact 3 turns type checking off for every
  caller.
- `Table<any, TData>`. Rejected: `any` is banned ([CONVENTIONS.md § TypeScript](../CONVENTIONS.md#typescript)),
  and it accepts every table while it checks none of the body's calls.

Consequences:

- Every prop type in the `.d.ts` carries a `TFeatures` parameter, and hover text is longer.
- `DataTableContext` still stores `DataTableContextShape<any, any>` behind an `oxlint-disable-next-line`,
  because a React context cannot carry a generic across the provider boundary, and `useDataTableContext` casts
  it back. This is the framework-boundary exception CONVENTIONS.md allows, and it is the one place the generics
  are erased.

### 2. A part whose purpose is a feature requires it twice

`DataTable.HeaderSortButton` and `DataTable.RowExpandButton` each need one feature to work at all. Each states
the requirement in two places:

- **A constraint on `TFeatures`.** `SortableTableFeatures = Pick<StockFeatures, "rowSortingFeature">` and
  `ExpandableTableFeatures = Pick<StockFeatures, "rowExpandingFeature">`. The signature then reads as the
  requirement, and the first line of a consumer's error names the alias. The alias omits `TableFeatures &` on
  purpose (see Consequences): a bare `Pick` still satisfies `Column`'s own `TFeatures extends TableFeatures`
  constraint, because every key of `TableFeatures` is optional.
- **An intersection with the feature's API interface on the prop.**
  `SortableColumn<…> = Column<TFeatures, TData, TValue> & Column_RowSorting<TFeatures, TData>` and
  `ExpandableRow<…> = Row<TFeatures, TData> & Row_RowExpanding` (`Row_RowExpanding` takes no type parameters
  in 9.2.4). The body can call `column.getIsSorted()`, `column.toggleSorting()`, `row.getCanExpand()`, and
  `row.getToggleExpandedHandler()` because the intersection names them.

Why both: Fact 2. With the constraint alone, the body cannot call the method. With the intersection alone, the
body compiles, but the signature no longer says which feature the part needs, and the requirement lives only in
a structural error about missing methods.

Alternatives:

- Call the static functions from `@tanstack/react-table/static-functions` everywhere and constrain nothing.
  Rejected: the part then accepts a column from any table, so the compiler never tells a consumer that their
  table cannot sort, and the body reads as a list of free functions instead of the column API the docs teach.
- Type the prop as `Column<any, TData, TValue>`. Rejected: banned `any`, and it accepts every column.
- Require `StockFeatures`. Rejected: the consumer must then register `stockFeatures`, which puts every feature
  in the bundle and defeats the reason v9 registers features per table.

Consequences:

- The error a consumer sees is longer than the requirement. For a column from `tableFeatures({})`, the probe
  reported:

  ```
  error TS2322: Type 'Column_Core<{}, Data, string>' is not assignable to type 'SortableColumn<SortableTableFeatures, Data, string>'.
    Type 'Column_Core<{}, Data, string>' is not assignable to type 'Column_Core<SortableTableFeatures, Data, string>'.
      Types of property 'parent' are incompatible.
        …
            Type 'Column_Core<{}, Data, string>' is missing the following properties from type 'Column_ColumnFaceting<SortableTableFeatures, Data>': getFacetedMinMaxValues, getFacetedRowModel, getFacetedUniqueValues
  ```

  That output came from a first draft whose alias was `TableFeatures & Pick<StockFeatures, "rowSortingFeature">`.
  The `TableFeatures &` half keeps every optional feature key, so `Column<SortableTableFeatures, …>` claimed
  every feature (Fact 3), and TypeScript reported the first one it found missing: faceting. The shipped alias
  is the bare `Pick<StockFeatures, "rowSortingFeature">`. With it the same probe ends on
  `Type 'Column_Core<{}, Data, string>' is missing the following properties from type 'Column_RowSorting<SortableTableFeatures, Data>': clearSorting, getAutoSortDir, getAutoSortFn, getCanMultiSort, and 8 more.`
  The row error keeps `ExpandableRow<ExpandableTableFeatures, Data>` on its first line but bottoms out in a
  `columnDef` mismatch, because `Row_Core` reaches `Column` through `_cellsCache` before it reaches
  `Row_RowExpanding`.

- The aliases come in pairs per feature. A third feature-requiring part (a selection checkbox, say) adds a
  third pair.
- The intersection is redundant at the call site. For a concrete `typeof features` that registers the feature,
  `Column<typeof features, …>` already includes `Column_RowSorting`, so only the generic body needs it.

### 3. A part that only reads optional feature state uses `callMemoOrStaticFn`

`DataTable.Row` (`getIsExpanded`, `getVisibleCells`), `DataTable.Header` through `resolveAriaSort`
(`getIsSorted`), `DataTable.EmptyRow` (`getVisibleLeafColumns`), and `DataTable.ExpandedRow`
(`getVisibleCells`) work with or without `rowExpandingFeature`, `rowSortingFeature`, and
`columnVisibilityFeature`. Each read goes through v9's own `callMemoOrStaticFn(obj, "method", staticFn)` with
the static function from `@tanstack/react-table/static-functions` (`column_getIsSorted`, `row_getIsExpanded`,
`row_getVisibleCells`, `table_getVisibleLeafColumns`). The helper is one line
(`@tanstack/table-core/dist/utils.js:345`):

```js
return obj[fnKey]?.(...args) ?? staticFn(obj, ...args);
```

When the feature is registered, the instance method runs, memoized per instance. When it is not, the static
function reads the same atoms (`row.table.atoms.expanded?.get() ?? {}`, `column.table.atoms.sorting?.get()`,
`column.table.atoms.columnVisibility?.get()`) and returns the neutral answer: not expanded, not sorted, every
column visible.

Alternatives:

- Require the features on these parts too. Rejected: every table would need `columnVisibilityFeature` to
  render a row and `rowExpandingFeature` to render an empty state, which forces features into bundles that
  never use them.
- Always call the static function. Rejected: it skips the per-instance memo on every table, including the ones
  that register the feature.
- Branch on `"getIsExpanded" in row`. Rejected: Fact 3 means the type never narrows (`row` already claims the
  method), so the check is a hand-written copy of `callMemoOrStaticFn` with no type benefit.

Consequences:

- For a table without the feature, the static function bypasses the memo. `row_getVisibleCells` walks every
  cell of the row on every render, and `table_getVisibleLeafColumns` filters every leaf column. v8 memoized
  both.
- Inside these bodies, `row`, `column`, and `table` claim every feature: Fact 3, plus `useDataTableContext()`
  defaults `TFeatures` to `TableFeatures`. The compiler accepts a direct `row.getIsExpanded()` that throws at
  runtime on a table without the feature. Correctness rests on the guards, not the types: every optional-feature
  read in these parts must go through `callMemoOrStaticFn`, and a reviewer checks that by eye. The
  `// Why callMemoOrStaticFn:` comments in `data-table.tsx` mark each site.
- `callMemoOrStaticFn` falls through on `??`. An instance method that returns `null` or `undefined` on purpose
  also runs the static function. None of the four methods here does (they return `boolean`, an array, or
  `false | SortDirection`), but a future part that reads a nullable method must not use this helper.

### 4. Row cells keep `flexRender(def, ctx)`

`DataTable.Row` renders each cell with `flexRender(cell.column.columnDef.cell, cell.getContext())`, not
`<FlexRender cell={cell} />` or `<table.FlexRender cell={cell} />`. v9's `FlexRender` component returns `null`
for a grouped row's placeholder cell (`if (groupingCell.getIsPlaceholder?.()) return null;` in
`@tanstack/react-table/dist/FlexRender.js`). In mantle the column's `cell` definition owns the `<td>`
(`DataTable.Cell`), so a `null` drops the `<td>`, and every cell after it shifts one column to the left.
`flexRender` renders the definition regardless, and the definition decides what a placeholder shows.

`DataTable.Head` keeps `flexRender` for consistency. It already renders an empty `Table.Header` for
`header.isPlaceholder` itself.

Alternatives: `FlexRender` and `table.FlexRender`. Rejected as above; both share one function body.

Consequences:

- `FlexRender` also picks `columnDef.aggregatedCell` for an aggregated cell, and `flexRender(def.cell, …)`
  ignores `aggregatedCell`. A consumer who groups and aggregates branches inside the `cell` definition on
  `props.cell.getIsAggregated()` and `props.cell.getIsPlaceholder()` instead of writing an `aggregatedCell`.
- `flexRender` is not deprecated in 9.2.4 (`@tanstack/react-table/dist/FlexRender.d.ts` documents both). If a
  later release deprecates it, this decision needs a replacement that keeps the `<td>`.

### 5. No new public exports

- `SortableTableFeatures`, `ExpandableTableFeatures`, `SortableColumn`, and `ExpandableRow` stay file-local in
  `data-table.tsx`. `@ngrok/mantle/data-table` exports `DataTable`, `expandedRowId`, and
  `export * from "@tanstack/react-table"`, as before (`index.ts`). Publishing an alias later is additive
  ([COMPONENT_SPEC.md §1.2](../COMPONENT_SPEC.md#12-ship-the-smallest-public-surface)); un-shipping one is
  breaking.
- The deprecated `@tanstack/react-table/legacy` shim (`useLegacyTable`, `legacyCreateColumnHelper`, the
  `get*RowModel` stubs) is not re-exported. It is a second way to build a table, deprecated on arrival, and its
  `LegacyTable` and `LegacyColumn` types would need their own set of parts.
- `stockFeatures` appears nowhere in mantle code, demos, or docs. The migration guide may name it as a consumer
  shortcut.
- Every sortable example registers `sortFns: { alphanumeric: sortFn_alphanumeric, datetime: sortFn_datetime,
text: sortFn_text }`. Those are the three names auto-sort resolves; numbers use `sortFn_basic` with no entry.
  Without a `sortFns` slot, auto-sort logs a dev warning and falls back to `sortFn_basic`, which orders
  mixed-case strings and dates differently from v8. The exported `sortFns` and `filterFns` registries are
  `@deprecated` in 9.2.4, so no example spreads them.

Consequences:

- A consumer who types a "sortable column" prop in their own wrapper writes the intersection themselves. The
  alias in an error message (`SortableTableFeatures`) names a type they cannot import.
- A consumer who copies an example writes three registry lines per sortable table. A shared `features` module
  per app removes the repetition; the guide recommends one.

### 6. This ships as a `minor`

Mantle is `0.x`, so a breaking change rides a `minor` ([VERSIONING.md](../VERSIONING.md)).
`.changeset/data-table-tanstack-table-v9.md` carries the release notes and links the migration guide at
`/migrations/data-table-tanstack-v9-migration`. Every `DataTable` part keeps its name and props; the break is
in the TanStack calls around it: `useReactTable` becomes `useTable` with a required `features`,
`createColumnHelper<TData>()` becomes `createColumnHelper<typeof features, TData>()`, a bare column array
becomes `columnHelper.columns([ … ])`, `table.getState()` becomes `table.state`, and `sortingFn` becomes
`sortFn`.

Consequences:

- There is no codemod. Each table is rewritten by hand.
- `HeaderSortButton` and `RowExpandButton` now reject tables that v8 accepted, because v8 had every feature on.
  A table that sorted through `getSortedRowModel()` must register `rowSortingFeature` or it stops compiling.

## Consequences

- The pattern for a future part is nameable in review. A part whose purpose is a feature takes a constraint and
  an intersection (decision 2). A part that only reads optional feature state takes `callMemoOrStaticFn` with
  the static function (decision 3). Never `any`, never `stockFeatures`, never a fixed `TFeatures`.
- A consumer's compile error names the alias on its first line and the feature's API interface on its last
  line, not `rowSortingFeature` in plain text. The JSDoc, the changeset, and the docs page promise only that the
  prop does not typecheck.
- Type safety inside the optional-feature parts is by guard, not by type. A review of `data-table.tsx` checks
  that every `row.`, `column.`, and `table.` feature call in `Row`, `Header`, `EmptyRow`, and `ExpandedRow`
  goes through `callMemoOrStaticFn`.

## Files

- `packages/mantle/src/components/data-table/data-table.tsx`: the parts, the file-local aliases, the
  `// Why callMemoOrStaticFn:` sites, and the `// Why flexRender, not FlexRender:` site.
- `packages/mantle/src/components/data-table/index.ts`: the export surface.
- `packages/mantle/package.json`: `"@tanstack/react-table": "9.2.4"`.
- `.changeset/data-table-tanstack-table-v9.md`: the release notes.
- `apps/www/app/docs/components/data-display/data-table.mdx`: the docs page.
- `apps/www/app/docs/migrations/data-table-tanstack-v9-migration.mdx`: the migration guide.
- Declarations read for the facts above, all at 9.2.4: `@tanstack/table-core/dist/types/Table.d.ts`,
  `types/Column.d.ts`, `types/Row.d.ts`, `types/TableFeatures.d.ts`, `utils.d.ts`, `utils.js`,
  `features/row-sorting/rowSortingFeature.types.d.ts`,
  `features/row-expanding/rowExpandingFeature.types.d.ts`,
  `features/column-visibility/columnVisibilityFeature.utils.js`; `@tanstack/react-table/dist/FlexRender.js`,
  `FlexRender.d.ts`, `useTable.d.ts`, `legacy.d.ts`, `static-functions.d.ts`.
