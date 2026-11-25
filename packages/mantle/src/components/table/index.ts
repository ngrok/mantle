/**
 * Re-exports for the Table component.
 *
 * @see https://mantle.ngrok.com/components/data-display/table
 */

import * as TableParts from "./table-parts.js";

/**
 * Use `Table` for STATIC, layout-driven tabular data: read-only data dumps,
 * simple key/value displays, plain markup tables. The API matches the HTML
 * `<table>` element 1:1, with no built-in sorting, filtering, pagination, or row
 * expansion.
 *
 * For INTERACTIVE tabular data with sorting / filtering / pagination / row
 * selection / expandable rows, use `DataTable` (built on TanStack Table)
 * instead. For a detail panel, pass `renderExpanded` to `DataTable.Row`. For
 * sub-rows, pass `getSubRows` to `useTable`.
 *
 * **Large lists.** Each rendered row costs mount and layout time, so a table
 * that renders every row of a large list blocks input while it mounts:
 * - Paginate a list that can grow past 100 rows, and show 100 rows or fewer on
 *   a page. Slice the rows with `useOffsetPagination` and
 *   `getOffsetPaginatedSlice`, and compose `CursorPagination` with
 *   `PaginationRange` under the table, as the paginated example below shows.
 * - Search and filter the whole list, then paginate the result. Pass the
 *   filtered length as `listSize`, so a new filter returns to the first page.
 * - Paginate before you virtualize. A page of 100 rows mounts fast, and the
 *   browser's find in page still sees every row on it.
 *
 * @useWhen Show static rows and columns of data, such as a read-only data dump, with no sorting,
 * filtering, or pagination.
 *
 * @siblings
 * - `DataTable`: the user sorts, filters, pages through, selects, or expands rows (a detail panel or sub-rows).
 * - `DescriptionList`: one record shows as label and value pairs.
 *
 * @see https://mantle.ngrok.com/components/data-display/table
 *
 * @example
 * Composition:
 * ```
 * Table.Root
 * └── Table.Element
 *     ├── Table.Caption
 *     ├── Table.Head
 *     │   └── Table.Row
 *     │       └── Table.Header
 *     ├── Table.Body
 *     │   └── Table.Row
 *     │       └── Table.Cell
 *     └── Table.Foot
 * ```
 *
 * @example
 * ```tsx
 * <Table.Root>
 *   <Table.Element>
 *     <Table.Caption>A list of your recent invoices.</Table.Caption>
 *     <Table.Head>
 *       <Table.Row>
 *         <Table.Header width="fit">Invoice</Table.Header>
 *         <Table.Header width="fit">Status</Table.Header>
 *         <Table.Header>Method</Table.Header>
 *         <Table.Header width="fit" className="text-right">Amount</Table.Header>
 *       </Table.Row>
 *     </Table.Head>
 *     <Table.Body>
 *       {invoices.map((invoice) => (
 *         <Table.Row key={invoice.invoice}>
 *           <Table.Cell width="fit" className="font-medium">{invoice.invoice}</Table.Cell>
 *           <Table.Cell width="fit">{invoice.paymentStatus}</Table.Cell>
 *           <Table.Cell>{invoice.paymentMethod}</Table.Cell>
 *           <Table.Cell width="fit" className="text-right">{invoice.totalAmount}</Table.Cell>
 *         </Table.Row>
 *       ))}
 *     </Table.Body>
 *     <Table.Foot>
 *       <Table.Row>
 *         <Table.Cell colSpan={3}>Total</Table.Cell>
 *         <Table.Cell width="fit" className="text-right">$2,500.00</Table.Cell>
 *       </Table.Row>
 *     </Table.Foot>
 *   </Table.Element>
 * </Table.Root>
 * ```
 */
const Table = TableParts;

export {
	//,
	Table,
};
