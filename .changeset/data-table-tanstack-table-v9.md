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
const pageSize = table.getState().pagination.pageSize;

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
const pageSize = table.state.pagination.pageSize;
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
