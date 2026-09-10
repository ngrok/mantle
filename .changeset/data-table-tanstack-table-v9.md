---
"@ngrok/mantle": minor
---

Move `DataTable` to TanStack Table v9 (`@tanstack/react-table` 9.2.4). v9 stores table state in TanStack
Store atoms, registers features per table so unused ones tree-shake away, and works with the React Compiler.
`@ngrok/mantle/data-table` still re-exports everything from `@tanstack/react-table`, so no app needs a direct
dependency on it. Follow the migration guide:
https://mantle.ngrok.com/migrations/data-table-tanstack-v9-migration

**Breaking: the table instance you build changes.** Every `DataTable` part keeps its name and props, but the
TanStack calls around it move to the v9 API:

```tsx
// before
import { DataTable, createColumnHelper, getCoreRowModel, getSortedRowModel, useReactTable } from "@ngrok/mantle/data-table";

const columnHelper = createColumnHelper<Payment>();
const columns = [columnHelper.accessor("email", { /* … */ })];
const table = useReactTable({
	data,
	columns,
	getCoreRowModel: getCoreRowModel(),
	getSortedRowModel: getSortedRowModel(),
});
const sorting = table.getState().sorting;

// after
import {
	DataTable,
	createColumnHelper,
	createSortedRowModel,
	rowSortingFeature,
	sortFn_alphanumeric,
	sortFn_datetime,
	sortFn_text,
	tableFeatures,
	useTable,
} from "@ngrok/mantle/data-table";

const features = tableFeatures({
	rowSortingFeature,
	sortedRowModel: createSortedRowModel(),
	sortFns: {
		alphanumeric: sortFn_alphanumeric,
		datetime: sortFn_datetime,
		text: sortFn_text,
	},
});
const columnHelper = createColumnHelper<typeof features, Payment>();
const columns = columnHelper.columns([columnHelper.accessor("email", { /* … */ })]);
const table = useTable({ features, data, columns });
const sorting = table.state.sorting;
```

- `useReactTable` is now `useTable`, and its options require `features` from `tableFeatures({ … })`.
- The `get*RowModel()` options are gone. The core row model is automatic. Register the rest as feature and
  slot pairs: `rowSortingFeature` + `sortedRowModel: createSortedRowModel()`, `columnFilteringFeature` (+
  `globalFilteringFeature`) + `filteredRowModel: createFilteredRowModel()`, `rowPaginationFeature` +
  `paginatedRowModel: createPaginatedRowModel()`, `rowExpandingFeature` + `expandedRowModel:
createExpandedRowModel()`, `columnGroupingFeature` + `groupedRowModel: createGroupedRowModel()`,
  `rowSelectionFeature`, `columnVisibilityFeature`.
- `createColumnHelper<TData>()` is now `createColumnHelper<typeof features, TData>()`, and the column array
  must go through `columnHelper.columns([ … ])`. A bare array no longer typechecks against the `columns`
  option.
- `table.getState()` is now the `table.state` property.
- `sortingFn` is now `sortFn`, and a string name resolves only against the `sortFns` slot. Register
  `sortFn_alphanumeric`, `sortFn_datetime`, and `sortFn_text` there to keep v8 auto-sort behavior; without a
  slot, auto-sort falls back to `sortFn_basic`. The exported `sortFns` and `filterFns` registries are deprecated in
  v9, so import the functions you use.
- A column's `filterFn`, including the `"auto"` default, resolves only against the `filterFns` slot, and a grouped
  total resolves only against `aggregationFns` with `rowAggregationFeature` registered. Register
  `includesString: filterFn_includesString` to keep v8 column filtering on string columns, and `sum: aggregationFn_sum`
  to keep v8 totals on group rows. Without them, a column filter returns every row and a group row's `getValue()` is
  `undefined`; only a development build warns.
- The instance types gain a leading `TFeatures` parameter: `Column<typeof features, TData, TValue>`,
  `Row<typeof features, TData>`, `Table<typeof features, TData>`, `ColumnDef`, `HeaderContext`, `CellContext`, and
  `TableOptions`. State types such as `SortingState` and `ExpandedState` are unchanged.

**What the mantle parts now require.** `DataTable.HeaderSortButton` accepts a `column` only from a table that
registers `rowSortingFeature`, and `DataTable.RowExpandButton` accepts a `row` only from a table that registers
`rowExpandingFeature`. Both are compile-time errors on that prop. `DataTable.Row`,
`DataTable.EmptyRow`, and `DataTable.ExpandedRow` work with or without `columnVisibilityFeature`: with it they
respect hidden columns, without it they render every column. `DataTable.Header` sets `aria-sort` only when the
table can sort.

**Not supported.** mantle does not re-export the deprecated `@tanstack/react-table/legacy` shim
(`useLegacyTable`, `legacyCreateColumnHelper`, the `get*RowModel` stubs). Move each table to `useTable`
instead.

**Performance.** Measured against `main` (v8) with a 6-column sortable table built from the `DataTable` parts, in
headless Chromium on production React 19.2.8, medians of 3 rounds:

| Rows   | Mount                  | Parent re-render, same props | Sort toggle             | New `data` array, same length | Retained heap after mount |
| ------ | ---------------------- | ---------------------------- | ----------------------- | ----------------------------- | ------------------------- |
| 1,000  | 33.6 → 31.1 ms (−7%)   | 8.2 → 7.4 ms (−10%)          | 14.5 → 11.7 ms (−19%)   | 14.3 → 11.9 ms (−17%)         | 9.8 → 7.4 MiB (−24%)      |
| 10,000 | 378.6 → 344.1 ms (−9%) | 78.4 → 73.6 ms (−6%)         | 263.5 → 238.9 ms (−9%)  | 143.3 → 121.4 ms (−15%)       | 105.8 → 82.0 MiB (−23%)   |

A consumer bundle that registers only `rowSortingFeature` is 0.8 kB gzip smaller than its v8 equivalent
(35.4 → 34.6 kB). A bundle that registers every stock feature is 5.5 kB larger (36.8 → 42.3 kB), because v9
features carry code that v8 shipped inside core. Register only the features a table uses.
