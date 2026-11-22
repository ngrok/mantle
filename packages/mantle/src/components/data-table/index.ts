/**
 * Re-exports for the Data Table component.
 *
 * @see https://mantle.ngrok.com/components/data-display/data-table
 */

import * as DataTableParts from "./data-table-parts.js";

export * from "@tanstack/react-table";

export { expandedRowId } from "./expanded-row-id.js";

/**
 * Use `DataTable` for INTERACTIVE tabular data: sorting, filtering, pagination,
 * row selection, expandable rows (a detail panel or sub-rows), and server-side
 * or client-side data. Built on TanStack Table; the consumer MUST construct a
 * `useTable` instance from `@tanstack/react-table` and pass it to
 * `DataTable.Root` via the `table` prop.
 * Every TanStack export (`useTable`, `tableFeatures`, `createColumnHelper`, the
 * `*Feature` objects, the `create*RowModel` factories, the `sortFn_*` and `filterFn_*` comparators,
 * …) is re-exported from `@ngrok/mantle/data-table` so a single import covers
 * both the wrapper components and the TanStack helpers.
 *
 * For STATIC, layout-driven tables (read-only data dumps, simple key/value
 * displays, plain markup tables with no interactivity), use `Table` instead.
 *
 * **Large lists.** Each rendered row costs mount and layout time, so a table
 * that renders every row of a large list blocks input while it mounts:
 * - Paginate a list that can grow past 100 rows, and show 100 rows or fewer on
 *   a page. Register `rowPaginationFeature` and compose `CursorPagination` with
 *   `PaginationRange` under the table, as the paginated example below shows.
 * - Search and filter the whole list, not the current page. The count line
 *   reads `getRowCount()`, which counts every row the filter keeps.
 * - Keep `autoResetPageIndex` at its default, so a new filter, sort, or data
 *   set returns the table to its first page.
 * - Paginate before you virtualize. A page of 100 rows mounts fast, and the
 *   browser's find in page still sees every row on it.
 *
 * @useWhen Show rows of application data that the user sorts, filters, pages through, selects, or
 * expands into a detail panel or sub-rows.
 *
 * @siblings
 * - `Table`: the data is static, with no sorting, filtering, pagination, selection, or row expansion.
 * - `DescriptionList`: one record shows as label and value pairs.
 *
 * @see https://mantle.ngrok.com/components/data-display/data-table
 *
 * @example
 * Composition:
 * ```
 * DataTable.Root
 * ├── DataTable.Head
 * │   └── DataTable.Row
 * │       ├── DataTable.ExpandHeader
 * │       ├── DataTable.Header
 * │       │   └── DataTable.HeaderSortButton
 * │       └── DataTable.ActionHeader
 * └── DataTable.Body
 *     ├── DataTable.Row
 *     │   ├── DataTable.ControlCell
 *     │   │   └── DataTable.RowExpandButton
 *     │   ├── DataTable.Cell
 *     │   └── DataTable.ActionCell
 *     ├── DataTable.ExpandedRow
 *     └── DataTable.EmptyRow
 * ```
 *
 * @example
 * A minimal, read-only table with a single sortable column:
 * ```tsx
 * import {
 *   DataTable,
 *   createColumnHelper,
 *   createSortedRowModel,
 *   rowSortingFeature,
 *   sortFn_alphanumeric,
 *   sortFn_datetime,
 *   sortFn_text,
 *   tableFeatures,
 *   useTable,
 * } from "@ngrok/mantle/data-table";
 *
 * type Row = { id: string; name: string };
 *
 * // Register only the features the table uses. Auto-sort resolves the
 * // `alphanumeric`, `text`, and `datetime` comparators by name, so register those three.
 * const features = tableFeatures({
 *   rowSortingFeature,
 *   sortedRowModel: createSortedRowModel(),
 *   sortFns: {
 *     alphanumeric: sortFn_alphanumeric,
 *     datetime: sortFn_datetime,
 *     text: sortFn_text,
 *   },
 * });
 *
 * const columnHelper = createColumnHelper<typeof features, Row>();
 * const columns = columnHelper.columns([
 *   columnHelper.accessor("name", {
 *     id: "name",
 *     header: (props) => (
 *       <DataTable.Header column={props.column}>
 *         <DataTable.HeaderSortButton column={props.column} sortingMode="alphanumeric">
 *           Name
 *         </DataTable.HeaderSortButton>
 *       </DataTable.Header>
 *     ),
 *     cell: (props) => <DataTable.Cell>{props.getValue()}</DataTable.Cell>,
 *   }),
 * ]);
 *
 * function MyTable({ data }: { data: Row[] }) {
 *   const table = useTable({ features, data, columns });
 *   const rows = table.getRowModel().rows;
 *
 *   return (
 *     <DataTable.Root table={table}>
 *       <DataTable.Head />
 *       <DataTable.Body>
 *         {rows.length > 0
 *           ? rows.map((row) => <DataTable.Row key={row.id} row={row} />)
 *           : <DataTable.EmptyRow>No results.</DataTable.EmptyRow>}
 *       </DataTable.Body>
 *     </DataTable.Root>
 *   );
 * }
 * ```
 *
 * @example
 * Sortable, filterable, paginated, with both empty states: a global text
 * filter, the no-data vs. no-results-for-filter empty states (an `Empty`
 * dropped into `DataTable.EmptyRow`), and `CursorPagination` with a page-size
 * dropdown:
 * ```tsx
 * import {
 *   DataTable,
 *   columnFilteringFeature,
 *   createColumnHelper,
 *   createFilteredRowModel,
 *   createPaginatedRowModel,
 *   createSortedRowModel,
 *   globalFilteringFeature,
 *   rowPaginationFeature,
 *   rowSortingFeature,
 *   sortFn_alphanumeric,
 *   sortFn_datetime,
 *   sortFn_text,
 *   tableFeatures,
 *   useTable,
 * } from "@ngrok/mantle/data-table";
 * import { Button } from "@ngrok/mantle/button";
 * import { CursorPagination, PaginationRange } from "@ngrok/mantle/pagination";
 * import { Empty } from "@ngrok/mantle/empty";
 * import { Input } from "@ngrok/mantle/input";
 * import { MagnifyingGlassIcon } from "@phosphor-icons/react/MagnifyingGlass";
 * import { TrayIcon } from "@phosphor-icons/react/Tray";
 * import { useState } from "react";
 *
 * type Payment = { id: string; amount: number; status: "pending" | "succeeded" | "failed"; email: string };
 *
 * // The table's initial page size. It must be one of PageSizeSelect's pageSizes
 * // (default 5 | 10 | 20 | 50 | 100).
 * const DEFAULT_PAGE_SIZE = 10;
 *
 * // `globalFilteringFeature` builds on `columnFilteringFeature`, so register both.
 * const features = tableFeatures({
 *   columnFilteringFeature,
 *   globalFilteringFeature,
 *   rowPaginationFeature,
 *   rowSortingFeature,
 *   filteredRowModel: createFilteredRowModel(),
 *   paginatedRowModel: createPaginatedRowModel(),
 *   sortedRowModel: createSortedRowModel(),
 *   sortFns: {
 *     alphanumeric: sortFn_alphanumeric,
 *     datetime: sortFn_datetime,
 *     text: sortFn_text,
 *   },
 * });
 *
 * const columnHelper = createColumnHelper<typeof features, Payment>();
 * const columns = columnHelper.columns([
 *   columnHelper.accessor("status", {
 *     id: "status",
 *     header: (props) => (
 *       <DataTable.Header column={props.column}>
 *         <DataTable.HeaderSortButton column={props.column} sortingMode="alphanumeric">
 *           Status
 *         </DataTable.HeaderSortButton>
 *       </DataTable.Header>
 *     ),
 *     cell: (props) => <DataTable.Cell>{props.getValue()}</DataTable.Cell>,
 *   }),
 *   columnHelper.accessor("email", {
 *     id: "email",
 *     header: (props) => (
 *       <DataTable.Header column={props.column}>
 *         <DataTable.HeaderSortButton column={props.column} sortingMode="alphanumeric">
 *           Email
 *         </DataTable.HeaderSortButton>
 *       </DataTable.Header>
 *     ),
 *     cell: (props) => <DataTable.Cell>{props.getValue()}</DataTable.Cell>,
 *   }),
 *   columnHelper.accessor("amount", {
 *     id: "amount",
 *     header: (props) => (
 *       <DataTable.Header className="text-right">
 *         <DataTable.HeaderSortButton
 *           column={props.column}
 *           sortingMode="alphanumeric"
 *           className="justify-end"
 *           iconPlacement="start"
 *         >
 *           Amount
 *         </DataTable.HeaderSortButton>
 *       </DataTable.Header>
 *     ),
 *     cell: (props) => (
 *       <DataTable.Cell className="text-right tabular-nums">
 *         {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(props.getValue())}
 *       </DataTable.Cell>
 *     ),
 *   }),
 * ]);
 *
 * function PaymentsTable({ data }: { data: Payment[] }) {
 *   const [globalFilter, setGlobalFilter] = useState("");
 *
 *   const table = useTable({
 *     features,
 *     data,
 *     columns,
 *     state: { globalFilter },
 *     onGlobalFilterChange: setGlobalFilter,
 *     initialState: { pagination: { pageIndex: 0, pageSize: DEFAULT_PAGE_SIZE } },
 *   });
 *   const rows = table.getRowModel().rows;
 *   const isFiltered = globalFilter.trim() !== "";
 *
 *   return (
 *     <div className="space-y-4">
 *       <Input
 *         placeholder="Filter payments…"
 *         value={globalFilter}
 *         onChange={(event) => setGlobalFilter(event.target.value)}
 *       />
 *       <DataTable.Root table={table}>
 *         <DataTable.Head />
 *         <DataTable.Body>
 *           {rows.length > 0 ? (
 *             rows.map((row) => <DataTable.Row key={row.id} row={row} />)
 *           ) : isFiltered ? (
 *             // No results for the active filter: give the user a way out.
 *             <DataTable.EmptyRow>
 *               <Empty.Root>
 *                 <Empty.Icon svg={<MagnifyingGlassIcon />} />
 *                 <Empty.Title>No payments match your filter</Empty.Title>
 *                 <Empty.Description>
 *                   <p>Try a different search, or clear the filter to see everything.</p>
 *                 </Empty.Description>
 *                 <Empty.Actions>
 *                   <Button
 *                     type="button"
 *                     appearance="outlined"
 *                     intent="neutral"
 *                     onClick={() => setGlobalFilter("")}
 *                   >
 *                     Clear filters
 *                   </Button>
 *                 </Empty.Actions>
 *               </Empty.Root>
 *             </DataTable.EmptyRow>
 *           ) : (
 *             // No data yet: informational, optionally a primary "create" action.
 *             <DataTable.EmptyRow>
 *               <Empty.Root>
 *                 <Empty.Icon svg={<TrayIcon />} />
 *                 <Empty.Title>No payments yet</Empty.Title>
 *                 <Empty.Description>
 *                   <p>Payments you receive will appear here.</p>
 *                 </Empty.Description>
 *               </Empty.Root>
 *             </DataTable.EmptyRow>
 *           )}
 *         </DataTable.Body>
 *       </DataTable.Root>
 *       <CursorPagination.Root
 *         className="flex flex-wrap justify-between"
 *         pageSize={table.state.pagination.pageSize}
 *         onChangePageSize={(size) => {
 *           table.setPageSize(size);
 *           table.setPageIndex(0); // reset to the first page when the size changes
 *         }}
 *       >
 *         <PaginationRange
 *           offset={table.state.pagination.pageIndex * table.state.pagination.pageSize}
 *           pageSize={table.state.pagination.pageSize}
 *           total={table.getRowCount()}
 *           noun={{ singular: "payment", plural: "payments" }}
 *         />
 *         <div className="flex items-center gap-2">
 *           <CursorPagination.PageSizeSelect />
 *           <CursorPagination.Buttons
 *             hasPreviousPage={table.getCanPreviousPage()}
 *             hasNextPage={table.getCanNextPage()}
 *             onPreviousPage={() => table.previousPage()}
 *             onNextPage={() => table.nextPage()}
 *           />
 *         </div>
 *       </CursorPagination.Root>
 *     </div>
 *   );
 * }
 * ```
 *
 * @example
 * Row action column: a sticky right-edge cell with a dropdown menu of actions.
 * The cell stops its own clicks, so the menu opens without a clickable row
 * navigating:
 * ```tsx
 * import { DataTable, createColumnHelper } from "@ngrok/mantle/data-table";
 * import { DropdownMenu } from "@ngrok/mantle/dropdown-menu";
 * import { IconButton } from "@ngrok/mantle/button";
 * import { DotsThreeVerticalIcon } from "@phosphor-icons/react/DotsThreeVertical";
 *
 * const columnHelper = createColumnHelper<typeof features, Payment>();
 *
 * const columns = columnHelper.columns([
 *   // …other columns…
 *   columnHelper.display({
 *     id: "actions",
 *     header: () => <DataTable.ActionHeader />,
 *     cell: (props) => (
 *       <DataTable.ActionCell>
 *         <DropdownMenu.Root>
 *           <DropdownMenu.Trigger asChild>
 *             <IconButton type="button" appearance="outlined" intent="neutral" label="Actions" icon={<DotsThreeVerticalIcon />} />
 *           </DropdownMenu.Trigger>
 *           <DropdownMenu.Content align="end">
 *             <DropdownMenu.Item onSelect={() => copy(props.row.original.id)}>
 *               Copy ID
 *             </DropdownMenu.Item>
 *             <DropdownMenu.Item onSelect={() => refund(props.row.original.id)}>
 *               Refund
 *             </DropdownMenu.Item>
 *           </DropdownMenu.Content>
 *         </DropdownMenu.Root>
 *       </DataTable.ActionCell>
 *     ),
 *   }),
 * ]);
 * ```
 *
 * @example
 * Clickable row navigating to a detail page. A `<tr>` is not focusable, so the
 * primary cell also renders a `<Link>` as the keyboard and screen-reader path.
 * `SandboxedOnClick` keeps the link's click from also running the row handler:
 * ```tsx
 * import { DataTable, useTable } from "@ngrok/mantle/data-table";
 * import { SandboxedOnClick } from "@ngrok/mantle/sandboxed-on-click";
 * import { Link, href, useNavigate } from "react-router";
 *
 * function PaymentsTable({ data }: { data: Payment[] }) {
 *   const navigate = useNavigate();
 *   const table = useTable({ features, data, columns });
 *   const rows = table.getRowModel().rows;
 *
 *   return (
 *     <DataTable.Root table={table}>
 *       <DataTable.Head />
 *       <DataTable.Body>
 *         {rows.map((row) => (
 *           <DataTable.Row
 *             key={row.id}
 *             row={row}
 *             onClick={() => navigate(href("/payments/:id", { id: row.original.id }))}
 *           />
 *         ))}
 *       </DataTable.Body>
 *     </DataTable.Root>
 *   );
 * }
 *
 * // The primary column's cell renders a <Link> for keyboard / a11y reachability.
 * columnHelper.accessor("email", {
 *   id: "email",
 *   header: (props) => <DataTable.Header>Email</DataTable.Header>,
 *   cell: (props) => (
 *     <DataTable.Cell>
 *       <SandboxedOnClick asChild allowClickEventDefault>
 *         <Link to={href("/payments/:id", { id: props.row.original.id })}>
 *           {props.getValue()}
 *         </Link>
 *       </SandboxedOnClick>
 *     </DataTable.Cell>
 *   ),
 * });
 * ```
 */
const DataTable = DataTableParts;

export {
	//,
	DataTable,
};

export type {
	//,
	DataTableColumnMeta,
} from "./types.js";
