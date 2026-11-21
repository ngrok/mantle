// Why "use no memo": a server component can render this file. A stateless part gains nothing from
// the compiler, and its cache hook would make the build mark the chunk "use client". `Root`
// watches its scroll position through the client `OverflowContainer`, so a page that renders
// `Table.Root` ships only that container.
"use no memo";

import type { ComponentProps } from "react";
import { cx } from "../../utils/cx/cx.js";
import type { WithDataSlot } from "../../utils/data-slot.js";
import { joinDataSlot } from "../../utils/data-slot.js";
import { OverflowContainer } from "./overflow-container.js";

/**
 * The `<Table.Root>` is the root container element for all `Table`s.
 * It draws the border and rounded corners, and scrolls wide content
 * horizontally with a fading scroll edge.
 *
 * Must be used as the parent of a `<Table.Element>`.
 *
 * @example
 * ```tsx
 * <Table.Root>
 *   <Table.Element>
 *     <Table.Caption>A list of your recent invoices.</Table.Caption>
 *     <Table.Head>
 *       <Table.Row>
 *         <Table.Header className="w-25">Invoice</Table.Header>
 *         <Table.Header>Status</Table.Header>
 *         <Table.Header>Method</Table.Header>
 *         <Table.Header className="text-right">Amount</Table.Header>
 *       </Table.Row>
 *     </Table.Head>
 *     <Table.Body>
 *       {invoices.map((invoice) => (
 *         <Table.Row key={invoice.invoice}>
 *           <Table.Cell className="font-medium">{invoice.invoice}</Table.Cell>
 *           <Table.Cell>{invoice.paymentStatus}</Table.Cell>
 *           <Table.Cell>{invoice.paymentMethod}</Table.Cell>
 *           <Table.Cell className="text-right">{invoice.totalAmount}</Table.Cell>
 *         </Table.Row>
 *       ))}
 *     </Table.Body>
 *     <Table.Foot>
 *       <Table.Row>
 *         <Table.Cell colSpan={3}>Total</Table.Cell>
 *         <Table.Cell className="text-right">$2,500.00</Table.Cell>
 *       </Table.Row>
 *     </Table.Foot>
 *   </Table.Element>
 * </Table.Root>
 * ```
 *
 * @example
 * Paginated, with the count line and a page-size select:
 * ```tsx
 * import {
 *   CursorPagination,
 *   PaginationRange,
 *   getOffsetPaginatedSlice,
 *   useOffsetPagination,
 * } from "@ngrok/mantle/pagination";
 * import { Table } from "@ngrok/mantle/table";
 *
 * function InvoicesTable({ invoices }: { invoices: Invoice[] }) {
 *   const pagination = useOffsetPagination({ listSize: invoices.length, pageSize: 20 });
 *   const pageInvoices = getOffsetPaginatedSlice(invoices, pagination);
 *
 *   return (
 *     <div className="flex flex-col gap-4">
 *       <Table.Root>
 *         <Table.Element>
 *           <Table.Head>
 *             <Table.Row>
 *               <Table.Header>Invoice</Table.Header>
 *               <Table.Header className="text-right">Amount</Table.Header>
 *             </Table.Row>
 *           </Table.Head>
 *           <Table.Body>
 *             {pageInvoices.map((invoice) => (
 *               <Table.Row key={invoice.invoice}>
 *                 <Table.Cell>{invoice.invoice}</Table.Cell>
 *                 <Table.Cell className="text-right">{invoice.totalAmount}</Table.Cell>
 *               </Table.Row>
 *             ))}
 *           </Table.Body>
 *         </Table.Element>
 *       </Table.Root>
 *       <CursorPagination.Root
 *         className="flex flex-wrap justify-between"
 *         pageSize={pagination.pageSize}
 *         onChangePageSize={pagination.setPageSize}
 *       >
 *         <PaginationRange
 *           offset={pagination.offset}
 *           pageSize={pagination.pageSize}
 *           total={invoices.length}
 *           noun={{ singular: "invoice", plural: "invoices" }}
 *         />
 *         <div className="flex items-center gap-2">
 *           <CursorPagination.PageSizeSelect />
 *           <CursorPagination.Buttons
 *             hasPreviousPage={pagination.hasPreviousPage}
 *             hasNextPage={pagination.hasNextPage}
 *             onPreviousPage={pagination.previousPage}
 *             onNextPage={pagination.nextPage}
 *           />
 *         </div>
 *       </CursorPagination.Root>
 *     </div>
 *   );
 * }
 * ```
 *
 * `ref` lands on the inner scroll container, so a consumer can read or set its
 * scroll position. Every other prop lands on the outer element.
 *
 * Data attributes it stamps on the outer element, for your own CSS to target:
 *
 * - `data-x-overflow="true" | "false"`: whether the content is wider than the
 *   container. Always present, so match the value, not the attribute.
 * - `data-x-scroll-end="true" | "false"`: whether an overflowing container is
 *   scrolled to its right edge. Always present.
 * - `data-sticky-active`: present only while the container overflows and is not
 *   scrolled to the end. `DataTable`'s pinned action column keys its shadow off
 *   this through `group-data-sticky-active/table:`.
 *
 * @see https://mantle.ngrok.com/components/data-display/table#tableroot
 */
const Root = ({
	"data-slot": dataSlot,
	className,
	...props
}: ComponentProps<"div"> & WithDataSlot) => (
	<OverflowContainer
		data-slot={joinDataSlot(dataSlot, "table")}
		className={cx(
			"group/table relative w-full overflow-hidden rounded-lg border border-card bg-white dark:bg-gray-100",
			className,
		)}
		{...props}
	/>
);

/**
 * The `<Table.Element>` is a structured way to display data in rows and columns. The API
 * matches the HTML `<table>` element 1:1.
 *
 * Permitted content in this order:
 * 1. optional: `<Table.Caption>`
 * 2. 0 or more: `<colgroup>` elements
 * 3. optional: `<Table.Head>`
 * 4. either one of the following:
 *    - 0 or more: `<Table.Body>`
 *    - 0 or more: `<Table.Row>`
 * 5. optional: `<Table.Foot>`
 *
 * @description
 * Establishes a table formatting context. Elements inside the `<Table.Element>`
 * generate rectangular boxes. Each box occupies a number of table cells
 * according to the following rules:
 *   1. The row boxes fill the table in the source code order from top to bottom.
 *      Each row box occupies one row of cells.
 *   2. A row group box occupies one or more row boxes.
 *   3. Column boxes are placed next to each other in source code order.
 *      Depending on the value of the dir attribute, the columns are laid in
 *      left-to-right or right-to-left direction. A column box occupies one or
 *      more columns of table cells.
 *   4. A column group box occupies one or more column boxes.
 *   5. A cell box may span over multiple rows and columns. User agents trim
 *      cells to fit in the available number of rows and columns.
 * Table cells do have padding. Boxes that make up a table do not have margins.
 * For more in depth information, see the [MDN documentation](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/table).
 *
 * @example
 * ```tsx
 * <Table.Root>
 *   <Table.Element>
 *     <Table.Caption>A list of your recent invoices.</Table.Caption>
 *     <Table.Head>
 *       <Table.Row>
 *         <Table.Header className="w-25">Invoice</Table.Header>
 *         <Table.Header>Status</Table.Header>
 *         <Table.Header>Method</Table.Header>
 *         <Table.Header className="text-right">Amount</Table.Header>
 *       </Table.Row>
 *     </Table.Head>
 *     <Table.Body>
 *       {invoices.map((invoice) => (
 *         <Table.Row key={invoice.invoice}>
 *           <Table.Cell className="font-medium">{invoice.invoice}</Table.Cell>
 *           <Table.Cell>{invoice.paymentStatus}</Table.Cell>
 *           <Table.Cell>{invoice.paymentMethod}</Table.Cell>
 *           <Table.Cell className="text-right">{invoice.totalAmount}</Table.Cell>
 *         </Table.Row>
 *       ))}
 *     </Table.Body>
 *     <Table.Foot>
 *       <Table.Row>
 *         <Table.Cell colSpan={3}>Total</Table.Cell>
 *         <Table.Cell className="text-right">$2,500.00</Table.Cell>
 *       </Table.Row>
 *     </Table.Foot>
 *   </Table.Element>
 * </Table.Root>
 * ```
 *
 * @see https://mantle.ngrok.com/components/data-display/table#tableelement
 */
const Element = ({
	"data-slot": dataSlot,
	children,
	className,
	ref,
	...props
}: ComponentProps<"table"> & WithDataSlot) => {
	return (
		<table
			data-slot={joinDataSlot(dataSlot, "table-element")}
			ref={ref}
			className={cx(
				"table-auto border-separate border-spacing-0 caption-bottom w-full min-w-full text-left",
				className,
			)}
			{...props}
		>
			{children}
		</table>
	);
};

/**
 * The `<Table.Head>` is a container for the table's column headers.
 * Encapsulates a set of `<Table.Row>`s, indicating that they comprise the head
 * of a table with information about the table's columns. This is usually in the
 * form of column headers (`<Table.Header>`).
 *
 * Must be used as a child of a `<Table.Element>`. It should only come after any
 * `<Table.Caption>` or `<colgroup>` and before any `<Table.Body>` or `<Table.Foot>`.
 *
 * Permitted Content:
 * 1. 0 or more: `<Table.Row>`
 *
 * @example
 * ```tsx
 * <Table.Root>
 *   <Table.Element>
 *     <Table.Caption>A list of your recent invoices.</Table.Caption>
 *     <Table.Head>
 *       <Table.Row>
 *         <Table.Header className="w-25">Invoice</Table.Header>
 *         <Table.Header>Status</Table.Header>
 *         <Table.Header>Method</Table.Header>
 *         <Table.Header className="text-right">Amount</Table.Header>
 *       </Table.Row>
 *     </Table.Head>
 *     <Table.Body>
 *       {invoices.map((invoice) => (
 *         <Table.Row key={invoice.invoice}>
 *           <Table.Cell className="font-medium">{invoice.invoice}</Table.Cell>
 *           <Table.Cell>{invoice.paymentStatus}</Table.Cell>
 *           <Table.Cell>{invoice.paymentMethod}</Table.Cell>
 *           <Table.Cell className="text-right">{invoice.totalAmount}</Table.Cell>
 *         </Table.Row>
 *       ))}
 *     </Table.Body>
 *     <Table.Foot>
 *       <Table.Row>
 *         <Table.Cell colSpan={3}>Total</Table.Cell>
 *         <Table.Cell className="text-right">$2,500.00</Table.Cell>
 *       </Table.Row>
 *     </Table.Foot>
 *   </Table.Element>
 * </Table.Root>
 * ```
 *
 * @see https://mantle.ngrok.com/components/data-display/table#tablehead
 */
const Head = ({
	"data-slot": dataSlot,
	children,
	className,
	ref,
	...props
}: ComponentProps<"thead"> & WithDataSlot) => (
	<thead
		data-slot={joinDataSlot(dataSlot, "table-head")}
		ref={ref}
		className={cx(
			//,
			// In border-separate, <tr>/<thead> borders don't render, so apply
			// dividers directly to cells.
			"[&>tr:last-child>*]:border-b [&>tr:last-child>*]:border-card-muted",
			"[&>tr+tr>*]:border-t [&>tr+tr>*]:border-card-muted",
			"text-muted bg-base",
			"[&>tr]:bg-base", // Row styling
			className,
		)}
		{...props}
	>
		{children}
	</thead>
);

/**
 * The `<Table.Body>` encapsulates a set of `<Table.Row>`s, indicating that they
 * comprise the body of a table's (main) data.
 *
 * Must be used as a child of a `<Table.Element>` and only come after any
 * `<Table.Caption>`, `<colgroup>`, or `<Table.Head>`.
 *
 * Permitted Content:
 * 1. 0 or more: `<Table.Row>`
 *
 * @example
 * ```tsx
 * <Table.Root>
 *   <Table.Element>
 *     <Table.Caption>A list of your recent invoices.</Table.Caption>
 *     <Table.Head>
 *       <Table.Row>
 *         <Table.Header className="w-25">Invoice</Table.Header>
 *         <Table.Header>Status</Table.Header>
 *         <Table.Header>Method</Table.Header>
 *         <Table.Header className="text-right">Amount</Table.Header>
 *       </Table.Row>
 *     </Table.Head>
 *     <Table.Body>
 *       {invoices.map((invoice) => (
 *         <Table.Row key={invoice.invoice}>
 *           <Table.Cell className="font-medium">{invoice.invoice}</Table.Cell>
 *           <Table.Cell>{invoice.paymentStatus}</Table.Cell>
 *           <Table.Cell>{invoice.paymentMethod}</Table.Cell>
 *           <Table.Cell className="text-right">{invoice.totalAmount}</Table.Cell>
 *         </Table.Row>
 *       ))}
 *     </Table.Body>
 *     <Table.Foot>
 *       <Table.Row>
 *         <Table.Cell colSpan={3}>Total</Table.Cell>
 *         <Table.Cell className="text-right">$2,500.00</Table.Cell>
 *       </Table.Row>
 *     </Table.Foot>
 *   </Table.Element>
 * </Table.Root>
 * ```
 *
 * @see https://mantle.ngrok.com/components/data-display/table#tablebody
 */
const Body = ({
	"data-slot": dataSlot,
	children,
	className,
	ref,
	...props
}: ComponentProps<"tbody"> & WithDataSlot) => (
	<tbody
		data-slot={joinDataSlot(dataSlot, "table-body")}
		className={cx(
			//,
			// In border-separate, <tr>/<tbody> borders don't render, so apply
			// dividers directly to cells.
			"[&>tr+tr>*]:border-t [&>tr+tr>*]:border-card-muted",
			"text-body",
			// Body row styling. The focus variant mirrors hover for a keyboard user:
			// a row lights up when a link or button inside it has visible focus, as
			// it does under the pointer.
			"[&>tr]:bg-card [&>tr]:not-only:hover:bg-card-hover [&>tr]:not-only:has-focus-visible:bg-card-hover",
			className,
		)}
		ref={ref}
		{...props}
	>
		{children}
	</tbody>
);

/**
 * The `<Table.Foot>` encapsulates a set of `<Table.Row>`s, indicating that they
 * comprise the foot of a table with information about the table's columns. This
 * is usually a summary of the columns, e.g., a sum of the given numbers in a
 * column.
 *
 * Must be used as a child of a `<Table.Element>` and only come after any
 * `<Table.Caption>`, `<colgroup>`, `<Table.Head>`, and `<Table.Body>`.
 *
 * Permitted Content:
 * 1. 0 or more: `<Table.Row>` elements
 *
 * @example
 * ```tsx
 * <Table.Root>
 *   <Table.Element>
 *     <Table.Caption>A list of your recent invoices.</Table.Caption>
 *     <Table.Head>
 *       <Table.Row>
 *         <Table.Header className="w-25">Invoice</Table.Header>
 *         <Table.Header>Status</Table.Header>
 *         <Table.Header>Method</Table.Header>
 *         <Table.Header className="text-right">Amount</Table.Header>
 *       </Table.Row>
 *     </Table.Head>
 *     <Table.Body>
 *       {invoices.map((invoice) => (
 *         <Table.Row key={invoice.invoice}>
 *           <Table.Cell className="font-medium">{invoice.invoice}</Table.Cell>
 *           <Table.Cell>{invoice.paymentStatus}</Table.Cell>
 *           <Table.Cell>{invoice.paymentMethod}</Table.Cell>
 *           <Table.Cell className="text-right">{invoice.totalAmount}</Table.Cell>
 *         </Table.Row>
 *       ))}
 *     </Table.Body>
 *     <Table.Foot>
 *       <Table.Row>
 *         <Table.Cell colSpan={3}>Total</Table.Cell>
 *         <Table.Cell className="text-right">$2,500.00</Table.Cell>
 *       </Table.Row>
 *     </Table.Foot>
 *   </Table.Element>
 * </Table.Root>
 * ```
 *
 * @see https://mantle.ngrok.com/components/data-display/table#tablefoot
 */
const Foot = ({
	"data-slot": dataSlot,
	children,
	className,
	ref,
	...props
}: ComponentProps<"tfoot"> & WithDataSlot) => (
	<tfoot
		data-slot={joinDataSlot(dataSlot, "table-foot")}
		ref={ref}
		className={cx(
			//,
			"font-medium text-body",
			// In border-separate, <tr>/<tfoot> borders don't render, so apply
			// dividers directly to cells.
			"[&>tr:first-child>*]:border-t [&>tr:first-child>*]:border-card-muted",
			"[&>tr+tr>*]:border-t [&>tr+tr>*]:border-card-muted",
			"[&>tr]:bg-gray-50/50 [&>tr]:hover:bg-card-hover", // Row styling
			className,
		)}
		{...props}
	>
		{children}
	</tfoot>
);

/**
 * The `<Table.Row>` defines a row of cells in a table. The row's cells can then
 * be established using a mix of `<Table.Cell>` and `<Table.Header>` components.
 *
 * Must be used as a child of a `<Table.Head>`, `<Table.Body>`, or `<Table.Foot>`.
 *
 * Permitted Content:
 * 1. 0 or more: `<Table.Header>` or `<Table.Cell>`
 *
 * @example
 * ```tsx
 * <Table.Root>
 *   <Table.Element>
 *     <Table.Caption>A list of your recent invoices.</Table.Caption>
 *     <Table.Head>
 *       <Table.Row>
 *         <Table.Header className="w-25">Invoice</Table.Header>
 *         <Table.Header>Status</Table.Header>
 *         <Table.Header>Method</Table.Header>
 *         <Table.Header className="text-right">Amount</Table.Header>
 *       </Table.Row>
 *     </Table.Head>
 *     <Table.Body>
 *       {invoices.map((invoice) => (
 *         <Table.Row key={invoice.invoice}>
 *           <Table.Cell className="font-medium">{invoice.invoice}</Table.Cell>
 *           <Table.Cell>{invoice.paymentStatus}</Table.Cell>
 *           <Table.Cell>{invoice.paymentMethod}</Table.Cell>
 *           <Table.Cell className="text-right">{invoice.totalAmount}</Table.Cell>
 *         </Table.Row>
 *       ))}
 *     </Table.Body>
 *     <Table.Foot>
 *       <Table.Row>
 *         <Table.Cell colSpan={3}>Total</Table.Cell>
 *         <Table.Cell className="text-right">$2,500.00</Table.Cell>
 *       </Table.Row>
 *     </Table.Foot>
 *   </Table.Element>
 * </Table.Root>
 * ```
 *
 * @see https://mantle.ngrok.com/components/data-display/table#tablerow
 */
const Row = ({
	"data-slot": dataSlot,
	children,
	ref,
	...props
}: ComponentProps<"tr"> & WithDataSlot) => (
	<tr data-slot={joinDataSlot(dataSlot, "table-row")} ref={ref} {...props}>
		{children}
	</tr>
);

/**
 * The `<Table.Header>` defines a cell as the header of a group of table cells
 * and may be used as a child of a `<Table.Row>`. The `scope` and `headers`
 * attributes define the exact nature of this group. `scope` defaults to
 * `"col"`; pass `scope="row"` for a header cell inside a body row.
 *
 * Must be used as a child of a `<Table.Row>`.
 *
 * Permitted Content:
 * 1. Flow content, but with no header, footer, sectioning content, or heading
 * content descendants.
 *
 * @example
 * ```tsx
 * <Table.Root>
 *   <Table.Element>
 *     <Table.Caption>A list of your recent invoices.</Table.Caption>
 *     <Table.Head>
 *       <Table.Row>
 *         <Table.Header className="w-25">Invoice</Table.Header>
 *         <Table.Header>Status</Table.Header>
 *         <Table.Header>Method</Table.Header>
 *         <Table.Header className="text-right">Amount</Table.Header>
 *       </Table.Row>
 *     </Table.Head>
 *     <Table.Body>
 *       {invoices.map((invoice) => (
 *         <Table.Row key={invoice.invoice}>
 *           <Table.Cell className="font-medium">{invoice.invoice}</Table.Cell>
 *           <Table.Cell>{invoice.paymentStatus}</Table.Cell>
 *           <Table.Cell>{invoice.paymentMethod}</Table.Cell>
 *           <Table.Cell className="text-right">{invoice.totalAmount}</Table.Cell>
 *         </Table.Row>
 *       ))}
 *     </Table.Body>
 *     <Table.Foot>
 *       <Table.Row>
 *         <Table.Cell colSpan={3}>Total</Table.Cell>
 *         <Table.Cell className="text-right">$2,500.00</Table.Cell>
 *       </Table.Row>
 *     </Table.Foot>
 *   </Table.Element>
 * </Table.Root>
 * ```
 *
 * @see https://mantle.ngrok.com/components/data-display/table#tableheader
 */
const Header = ({
	"data-slot": dataSlot,
	children,
	className,
	ref,
	scope = "col",
	...props
}: ComponentProps<"th"> & WithDataSlot) => (
	<th
		data-slot={joinDataSlot(dataSlot, "table-header")}
		ref={ref}
		scope={scope}
		// `px-3` must equal the horizontal padding on `Table.Cell`, or the column label
		// sits outboard of the body text.
		className={cx(
			"h-11 px-3 text-left align-middle text-sm font-medium has-[[role=checkbox]]:pr-0",
			className,
		)}
		{...props}
	>
		{children}
	</th>
);

/**
 * The `<Table.Cell>` defines a cell of a table that contains data and may be
 * used as a child of a `<Table.Row>`.
 *
 * Must be used as a child of a `<Table.Row>`.
 *
 * Permitted Content:
 * 1. Flow content
 *
 * @example
 * ```tsx
 * <Table.Root>
 *   <Table.Element>
 *     <Table.Caption>A list of your recent invoices.</Table.Caption>
 *     <Table.Head>
 *       <Table.Row>
 *         <Table.Header className="w-25">Invoice</Table.Header>
 *         <Table.Header>Status</Table.Header>
 *         <Table.Header>Method</Table.Header>
 *         <Table.Header className="text-right">Amount</Table.Header>
 *       </Table.Row>
 *     </Table.Head>
 *     <Table.Body>
 *       {invoices.map((invoice) => (
 *         <Table.Row key={invoice.invoice}>
 *           <Table.Cell className="font-medium">{invoice.invoice}</Table.Cell>
 *           <Table.Cell>{invoice.paymentStatus}</Table.Cell>
 *           <Table.Cell>{invoice.paymentMethod}</Table.Cell>
 *           <Table.Cell className="text-right">{invoice.totalAmount}</Table.Cell>
 *         </Table.Row>
 *       ))}
 *     </Table.Body>
 *     <Table.Foot>
 *       <Table.Row>
 *         <Table.Cell colSpan={3}>Total</Table.Cell>
 *         <Table.Cell className="text-right">$2,500.00</Table.Cell>
 *       </Table.Row>
 *     </Table.Foot>
 *   </Table.Element>
 * </Table.Root>
 * ```
 *
 * @see https://mantle.ngrok.com/components/data-display/table#tablecell
 */
const Cell = ({
	"data-slot": dataSlot,
	children,
	className,
	ref,
	...props
}: ComponentProps<"td"> & WithDataSlot) => (
	<td
		data-slot={joinDataSlot(dataSlot, "table-cell")}
		ref={ref}
		className={cx("p-3 align-middle has-[[role=checkbox]]:pr-0 font-mono text-mono", className)}
		{...props}
	>
		{children}
	</td>
);

/**
 * The optional `<Table.Caption>` specifies the caption (or title) of a table,
 * which gives the table its accessible name.
 *
 * If used, must be the first child of a `<Table.Element>`.
 *
 * Permitted Content:
 * 1. Flow content
 *
 * @example
 * ```tsx
 * <Table.Root>
 *   <Table.Element>
 *     <Table.Caption>A list of your recent invoices.</Table.Caption>
 *     <Table.Head>
 *       <Table.Row>
 *         <Table.Header className="w-25">Invoice</Table.Header>
 *         <Table.Header>Status</Table.Header>
 *         <Table.Header>Method</Table.Header>
 *         <Table.Header className="text-right">Amount</Table.Header>
 *       </Table.Row>
 *     </Table.Head>
 *     <Table.Body>
 *       {invoices.map((invoice) => (
 *         <Table.Row key={invoice.invoice}>
 *           <Table.Cell className="font-medium">{invoice.invoice}</Table.Cell>
 *           <Table.Cell>{invoice.paymentStatus}</Table.Cell>
 *           <Table.Cell>{invoice.paymentMethod}</Table.Cell>
 *           <Table.Cell className="text-right">{invoice.totalAmount}</Table.Cell>
 *         </Table.Row>
 *       ))}
 *     </Table.Body>
 *     <Table.Foot>
 *       <Table.Row>
 *         <Table.Cell colSpan={3}>Total</Table.Cell>
 *         <Table.Cell className="text-right">$2,500.00</Table.Cell>
 *       </Table.Row>
 *     </Table.Foot>
 *   </Table.Element>
 * </Table.Root>
 * ```
 *
 * @see https://mantle.ngrok.com/components/data-display/table#tablecaption
 */
const Caption = ({
	"data-slot": dataSlot,
	children,
	className,
	ref,
	...props
}: ComponentProps<"caption"> & WithDataSlot) => (
	<caption
		data-slot={joinDataSlot(dataSlot, "table-caption")}
		ref={ref}
		className={cx("py-4 text-sm text-gray-500", "border-t border-card-muted", className)}
		{...props}
	>
		{children}
	</caption>
);

export {
	//,
	Body,
	Caption,
	Cell,
	Element,
	Foot,
	Head,
	Header,
	Root,
	Row,
};
