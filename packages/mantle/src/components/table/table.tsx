"use client";

import type { ComponentProps, ComponentRef, CSSProperties, RefCallback } from "react";
import { createContext, useCallback, useContext, useLayoutEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useComposedRefs } from "../../utils/compose-refs/use-composed-refs.js";
import { cx } from "../../utils/cx/cx.js";
import type { WithDataSlot } from "../../utils/data-slot.js";
import { joinDataSlot } from "../../utils/data-slot.js";

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
 *               <Table.Header width="fit">Invoice</Table.Header>
 *               <Table.Header width="fit" className="text-right">Amount</Table.Header>
 *             </Table.Row>
 *           </Table.Head>
 *           <Table.Body>
 *             {pageInvoices.map((invoice) => (
 *               <Table.Row key={invoice.invoice}>
 *                 <Table.Cell>{invoice.invoice}</Table.Cell>
 *                 <Table.Cell width="fit" className="text-right">{invoice.totalAmount}</Table.Cell>
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
 * - `data-x-overflow`: present while the content is wider than the container.
 * - `data-x-scroll-end`: present while an overflowing container is scrolled to
 *   its right edge.
 * - `data-sticky-active`: present only while the container overflows and is not
 *   scrolled to the end. `DataTable`'s pinned action column keys its shadow off
 *   this through `group-data-sticky-active/table:`.
 *
 * @see https://mantle.ngrok.com/components/data-display/table#tableroot
 */
const Root = ({
	"data-slot": dataSlot,
	children,
	className,
	ref,
	...props
}: ComponentProps<"div"> & WithDataSlot) => {
	const horizontalOverflow = useHorizontalOverflowObserver<ComponentRef<"div">>();
	const scrollContainerRef = useComposedRefs(horizontalOverflow.ref, ref);

	return (
		<div
			data-slot={joinDataSlot(dataSlot, "table")}
			className={cx(
				"group/table relative w-full overflow-hidden rounded-xl border border-card bg-white dark:bg-gray-100",
				className,
			)}
			data-sticky-active={
				horizontalOverflow.state.hasOverflow && !horizontalOverflow.state.scrolledToEnd
					? ""
					: undefined
			}
			data-x-overflow={horizontalOverflow.state.hasOverflow ? "" : undefined}
			data-x-scroll-end={
				horizontalOverflow.state.hasOverflow && horizontalOverflow.state.scrolledToEnd
					? ""
					: undefined
			}
			{...props}
		>
			<div
				className={cx(
					"scrollbar scroll-fade-x overflow-x-auto overflow-y-clip overscroll-x-none",
					// The edge fade is driven by the `scroll-fade-x` utility (a CSS
					// scroll-driven animation). When the table contains a sticky right column
					// (e.g., DataTable.ActionCell / DataTable.ActionHeader), suppress the
					// container's right-side fade so the pinned column stays fully opaque. The
					// pinned column draws its own left-side gradient for the scroll-under
					// effect.
					"has-data-mantle-table-sticky-right:[--_fade-right:black]",
				)}
				ref={scrollContainerRef}
			>
				<ObserveContentContext value={horizontalOverflow.observeContent}>
					{children}
				</ObserveContentContext>
			</div>
		</div>
	);
};

/**
 * The `<Table.Element>` is a structured way to display data in rows and columns. The API
 * matches the HTML `<table>` element 1:1.
 *
 * Tradeoff: with 2 to 24 header cells, the table lays out as a CSS grid. When
 * the table is the first item on a page, VoiceOver in Safari starts on the
 * first header cell, not on the table. WebKit puts each grid cell on its own
 * text line, and no CSS changes this. With content before the table, VoiceOver
 * reads it the same as a table with `display: table`.
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
	const observeContent = useContext(ObserveContentContext);
	const composedRef = useComposedRefs(ref, observeContent);

	return (
		<table
			data-slot={joinDataSlot(dataSlot, "table-element")}
			// oxlint-disable-next-line jsx-a11y/no-redundant-roles -- Why: the grid layout changes `display`, and a browser can drop the table semantics of such an element; an explicit role keeps them.
			role="table"
			ref={composedRef}
			className={cx(
				"table-auto border-separate border-spacing-0 caption-bottom w-full min-w-min text-left",
				gridLayoutClassName,
				gridColumnCountClassName,
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
		// oxlint-disable-next-line jsx-a11y/no-redundant-roles -- Why: the grid layout changes `display`, and a browser can drop the table semantics of such an element; an explicit role keeps them.
		role="rowgroup"
		ref={ref}
		className={cx(
			//,
			"[display:var(--_table-display,table-header-group)]",
			subgridClassName,
			// In border-separate, <tr>/<thead> borders don't render, so apply
			// dividers directly to cells. Why a bottom border on each row: it draws
			// the same lines as a divider between rows plus one under the last row,
			// with no sibling or structural selector. `tr:not(:has(+tr))` made
			// Chromium restyle about 3,700 elements for each node that a streamed
			// answer inserted, on any page with this rule.
			"[&>tr>*]:border-b [&>tr>*]:border-card-muted",
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
		// oxlint-disable-next-line jsx-a11y/no-redundant-roles -- Why: the grid layout changes `display`, and a browser can drop the table semantics of such an element; an explicit role keeps them.
		role="rowgroup"
		className={cx(
			//,
			"[display:var(--_table-display,table-row-group)]",
			subgridClassName,
			// In border-separate, <tr>/<tbody> borders don't render, so apply
			// dividers directly to cells. Why `tr+tr` stays (a known trade-off):
			// with it, a row inserted at the top or middle of a 200-row body
			// restyles all 1,442 elements of the body, not 7. Each other form we
			// measured moves that cost: `tr:has(+tr)` restyles the body
			// on each append, and `nth-child(n+2)` on each middle insert. This rule
			// also keeps the restyle when a `data-slot` element is inserted into a
			// parent that sibling rules mark (4,259 elements on a docs page, 84
			// without it).
			// oxlint-disable-next-line mantle/no-structural-combinator -- Why: the measured trade-off above.
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
		// oxlint-disable-next-line jsx-a11y/no-redundant-roles -- Why: the grid layout changes `display`, and a browser can drop the table semantics of such an element; an explicit role keeps them.
		role="rowgroup"
		ref={ref}
		className={cx(
			//,
			"[display:var(--_table-display,table-footer-group)]",
			subgridClassName,
			"font-medium text-body",
			// In border-separate, <tr>/<tfoot> borders don't render, so apply
			// dividers directly to cells. Why each row and not `:first-child`: see `Head`.
			"[&>tr>*]:border-t [&>tr>*]:border-card-muted",
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
 *
 * @see https://mantle.ngrok.com/components/data-display/table#tablerow
 */
const Row = ({
	"data-slot": dataSlot,
	children,
	className,
	ref,
	...props
}: ComponentProps<"tr"> & WithDataSlot) => (
	<tr
		data-slot={joinDataSlot(dataSlot, "table-row")}
		ref={ref}
		// oxlint-disable-next-line jsx-a11y/no-redundant-roles, jsx-a11y/no-interactive-element-to-noninteractive-role -- Why: the grid layout changes `display`, and a browser can drop the table semantics of such an element; an explicit role keeps them.
		role="row"
		className={cx(
			"[display:var(--_table-display,table-row)]",
			subgridClassName,
			cellWidthClassName,
			className,
		)}
		{...props}
	>
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
 *
 * @see https://mantle.ngrok.com/components/data-display/table#tableheader
 */
const Header = ({
	"data-slot": dataSlot,
	children,
	className,
	ref,
	scope = "col",
	colSpan,
	style,
	width,
	...props
}: Omit<ComponentProps<"th">, "width"> & WithDataSlot & WithColumnWidth) => (
	<th
		data-slot={joinDataSlot(dataSlot, "table-header")}
		data-column-width={width}
		ref={ref}
		role={scope === "row" || scope === "rowgroup" ? "rowheader" : "columnheader"}
		scope={scope}
		{...spanProps(colSpan, style)}
		// `px-3` must equal the horizontal padding on `Table.Cell`, or the column label
		// sits outboard of the body text.
		className={cx(
			"h-11 px-3 text-left align-middle content-center text-sm font-medium has-[[role=checkbox]]:pr-0",
			width !== "wrap" && "whitespace-nowrap",
			className,
		)}
		{...props}
	>
		{children}
	</th>
);

/**
 * The `<Table.Cell>` defines a cell of a table that contains data and may be
 * used as a child of a `<Table.Row>`. With no `width`, the cell keeps its
 * value on one line and truncates it with an ellipsis when the column is too
 * narrow. Pass `width="fit"` for a short value that must not truncate, and
 * `width="wrap"` for prose.
 *
 * Must be used as a child of a `<Table.Row>`.
 *
 * **Data attributes:**
 *
 * | Data Attribute | Value | Description |
 * | --- | --- | --- |
 * | `data-slot` | `"table-cell"` | On the `<td>`. |
 * | `data-column-width` | `"fit"` \| `"wrap"` | The `width` prop, when set. |
 * | `data-slot` | `"table-cell-content"` | On the `<div>` that wraps the children when `width` is not set. |
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
 *
 * @see https://mantle.ngrok.com/components/data-display/table#tablecell
 */
const Cell = ({
	"data-slot": dataSlot,
	children,
	className,
	ref,
	colSpan,
	style,
	width,
	...props
}: Omit<ComponentProps<"td">, "width"> & WithDataSlot & WithColumnWidth) => (
	<td
		data-slot={joinDataSlot(dataSlot, "table-cell")}
		data-column-width={width}
		ref={ref}
		// oxlint-disable-next-line jsx-a11y/no-redundant-roles, jsx-a11y/no-interactive-element-to-noninteractive-role -- Why: the grid layout changes `display`, and a browser can drop the table semantics of such an element; an explicit role keeps them.
		role="cell"
		{...spanProps(colSpan, style)}
		className={cx(
			"p-3 align-middle content-center has-[[role=checkbox]]:pr-0 font-mono text-mono",
			width !== "wrap" && "whitespace-nowrap",
			className,
		)}
		{...props}
	>
		{width == null ? (
			// Why a grid: in `table-auto`, a column is never narrower than its widest
			// min-content. A `minmax(0,1fr)` track has a min-content of 0 and a
			// max-content of its content, so the column asks for the full value when
			// the table has room and gives way to `min-w-24` when it does not.
			// Why `overflow-x-clip` and `px-1 -mx-1`: `clip` keeps the vertical
			// overflow visible, and the padding keeps a focus ring at the start or
			// end of the content inside the clip.
			<div data-slot="table-cell-content" className="grid min-w-24 grid-cols-[minmax(0,1fr)]">
				<div className="-mx-1 overflow-x-clip px-1 text-ellipsis">{children}</div>
			</div>
		) : (
			children
		)}
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
		className={cx(
			"py-4 text-sm text-gray-500",
			"border-t border-card-muted",
			// In the grid layout, the caption spans every column and sits last, as
			// `caption-bottom` puts it in the table layout.
			"col-span-full order-1",
			className,
		)}
		{...props}
	>
		{children}
	</caption>
);

/**
 * The column layout of the table. With the browser's table layout, a column
 * gets spare width in proportion to its content, so the column with the
 * longest values takes most of the row. A CSS grid with one `auto` track for
 * each column gives each column an equal share of the spare width. A last
 * column of `DataTable.ActionHeader` and a first column of
 * `DataTable.ControlCell` get a `min-content` track, so they stay as narrow
 * as their controls. No script measures the table.
 *
 * The grid needs the number of tracks: `gridColumnCountClassName` counts the
 * cells of the last header row. A table with no `<thead>`, with more than 24
 * columns, or with a spanning cell in that row keeps the table layout. The row groups and
 * rows read `--_table-display` and become subgrids only in the grid layout.
 * The reset of each property keeps a nested table from taking its parent's
 * grid.
 */
const gridLayoutClassName = cx(
	"[--_table-columns:initial] [--_table-display:initial]",
	"[display:var(--_table-display,table)] grid-cols-[repeat(var(--_table-columns),auto)]",
	// oxlint-disable-next-line mantle/no-structural-combinator -- Why: the `:has()` tests this table's own header row, so it reruns only when that row changes.
	"has-[>thead>tr:last-child>:nth-child(2)]:not-has-[>thead>tr:last-child>:nth-child(25)]:not-has-[>thead>tr:last-child>[aria-colspan]]:[--_table-display:grid]",
	// A control column (a row checkbox or expand toggle) first, an action column last, or both.
	// oxlint-disable-next-line mantle/no-structural-combinator -- Why: as above, for the header row and the first body row.
	"has-[>thead>tr:last-child>[data-slot~=data-table-action-header]:last-child]:grid-cols-[repeat(calc(var(--_table-columns)-1),auto)_min-content]",
	// oxlint-disable-next-line mantle/no-structural-combinator -- Why: as above.
	"has-[>thead>tr:last-child>[data-slot~=data-table-expand-header]:first-child,>tbody>tr:first-child>[data-slot~=data-table-control-cell]:first-child]:grid-cols-[min-content_repeat(calc(var(--_table-columns)-1),auto)]",
	// oxlint-disable-next-line mantle/no-structural-combinator -- Why: as above.
	"has-[>thead>tr:last-child>[data-slot~=data-table-action-header]:last-child]:has-[>thead>tr:last-child>[data-slot~=data-table-expand-header]:first-child,>tbody>tr:first-child>[data-slot~=data-table-control-cell]:first-child]:grid-cols-[min-content_repeat(calc(var(--_table-columns)-2),auto)_min-content]",
);

/**
 * Sets `--_table-columns` to the number of cells in the last header row, for 2
 * to 24 columns. Why literal classes: Tailwind generates only the classes it
 * finds in the source.
 */
// oxlint-disable-next-line mantle/no-structural-combinator -- Why: the `:has()` tests this table's own header row, so it reruns only when that row changes.
const gridColumnCountClassName =
	"has-[>thead>tr:last-child>:nth-child(2):last-child]:[--_table-columns:2] has-[>thead>tr:last-child>:nth-child(3):last-child]:[--_table-columns:3] has-[>thead>tr:last-child>:nth-child(4):last-child]:[--_table-columns:4] has-[>thead>tr:last-child>:nth-child(5):last-child]:[--_table-columns:5] has-[>thead>tr:last-child>:nth-child(6):last-child]:[--_table-columns:6] has-[>thead>tr:last-child>:nth-child(7):last-child]:[--_table-columns:7] has-[>thead>tr:last-child>:nth-child(8):last-child]:[--_table-columns:8] has-[>thead>tr:last-child>:nth-child(9):last-child]:[--_table-columns:9] has-[>thead>tr:last-child>:nth-child(10):last-child]:[--_table-columns:10] has-[>thead>tr:last-child>:nth-child(11):last-child]:[--_table-columns:11] has-[>thead>tr:last-child>:nth-child(12):last-child]:[--_table-columns:12] has-[>thead>tr:last-child>:nth-child(13):last-child]:[--_table-columns:13] has-[>thead>tr:last-child>:nth-child(14):last-child]:[--_table-columns:14] has-[>thead>tr:last-child>:nth-child(15):last-child]:[--_table-columns:15] has-[>thead>tr:last-child>:nth-child(16):last-child]:[--_table-columns:16] has-[>thead>tr:last-child>:nth-child(17):last-child]:[--_table-columns:17] has-[>thead>tr:last-child>:nth-child(18):last-child]:[--_table-columns:18] has-[>thead>tr:last-child>:nth-child(19):last-child]:[--_table-columns:19] has-[>thead>tr:last-child>:nth-child(20):last-child]:[--_table-columns:20] has-[>thead>tr:last-child>:nth-child(21):last-child]:[--_table-columns:21] has-[>thead>tr:last-child>:nth-child(22):last-child]:[--_table-columns:22] has-[>thead>tr:last-child>:nth-child(23):last-child]:[--_table-columns:23] has-[>thead>tr:last-child>:nth-child(24):last-child]:[--_table-columns:24]";

/**
 * The classes that make a row group or a row a subgrid of the table in the
 * grid layout. In the table layout, they do nothing.
 */
const subgridClassName = "col-span-full grid-cols-subgrid";

/**
 * Keeps each cell as wide as its column. In the grid layout, a cell's
 * `width` or `max-width` sizes only the cell, not its column, so a cell with
 * `w-60` or `max-w-0` would stop short of its column and break the row's
 * dividers. The grid sizes every column, so the row drops both. A `min-w-*`
 * on a cell still sets the column's least width.
 */
// Why `!`: a width class on a cell must lose to the row, which a class merge cannot do.
const cellWidthClassName = "[&>*]:w-auto! [&>*]:max-w-none!";

/**
 * The span props of a cell that covers more than one column. In the grid
 * layout, `colSpan` does nothing, so the cell also spans the grid tracks. With
 * explicit roles, a screen reader reads the span from `aria-colspan`.
 *
 * @example
 * ```ts
 * spanProps(3, undefined); // => { colSpan: 3, "aria-colspan": 3, style: { gridColumn: "span 3" } }
 * spanProps(undefined, { color: "red" }); // => { style: { color: "red" } }
 * ```
 */
function spanProps(colSpan: number | undefined, style: CSSProperties | undefined) {
	if (colSpan == null || colSpan <= 1) {
		return { colSpan, style };
	}
	return {
		colSpan,
		"aria-colspan": colSpan,
		style: { gridColumn: `span ${colSpan}`, ...style },
	};
}

/**
 * How a table column sizes. When omitted, the column's cells stay on one line,
 * the column shares the table's spare width, and a value longer than its share
 * truncates with an ellipsis. `"fit"` keeps the column one line and never
 * truncates it, for short values such as a date, a status, or a control.
 * `"wrap"` lets the column's text wrap onto more lines, for prose.
 */
type ColumnWidth = "fit" | "wrap";

/**
 * The `width` prop of `Table.Header` and `Table.Cell`.
 */
type WithColumnWidth = {
	/**
	 * How the column sizes. Pass the same value to the column's header and to
	 * each of its cells.
	 *
	 * - omitted: one line; the column shares the spare width and truncates its
	 *   value with an ellipsis when the table is too narrow.
	 * - `"fit"`: one line, never truncated. Use for a short value, such as a
	 *   date, a status, or a control.
	 * - `"wrap"`: the text wraps onto more lines. Use for prose.
	 */
	width?: ColumnWidth;
};

export type { ColumnWidth };

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

/**
 * Lets each `Table.Element` add itself to its `Table.Root`'s `ResizeObserver`.
 *
 * @private
 */
const ObserveContentContext = createContext<RefCallback<HTMLTableElement> | undefined>(undefined);

/**
 * A custom hook that observes the horizontal overflow of an element and determines
 * if it has overflow and if it is scrolled to the end.
 *
 * @private
 */
function useHorizontalOverflowObserver<T extends HTMLElement>() {
	const ref = useRef<T | null>(null);
	const observerRef = useRef<ResizeObserver | null>(null);
	const [state, setState] = useState({ hasOverflow: false, scrolledToEnd: false });

	// Why a set: a table mounts before the effect makes the observer, and a table
	// can sit inside a wrapper or replace another one later.
	const tablesRef = useRef(new Set<HTMLTableElement>());
	const observeContent = useCallback((content: HTMLTableElement | null) => {
		if (content == null) {
			return;
		}
		tablesRef.current.add(content);
		observerRef.current?.observe(content);
		return () => {
			tablesRef.current.delete(content);
			observerRef.current?.unobserve(content);
		};
	}, []);

	useLayoutEffect(() => {
		const element = ref.current;
		if (!element) {
			return;
		}

		let frameId = 0;

		const checkState = () => {
			const hasOverflow = element.scrollWidth > element.clientWidth;
			const scrolledToEnd =
				Math.abs(element.scrollWidth - element.scrollLeft - element.clientWidth) < 1;

			setState((previous) =>
				previous.hasOverflow === hasOverflow && previous.scrolledToEnd === scrolledToEnd
					? previous
					: { hasOverflow, scrolledToEnd },
			);
		};

		// Coalesce rapid-fire scroll events into a single layout read per
		// animation frame to avoid redundant work.
		const scheduleCheck = () => {
			if (frameId === 0) {
				frameId = requestAnimationFrame(() => {
					frameId = 0;
					checkState();
				});
			}
		};

		// Why the observer does the first read: inside this effect, a `scrollWidth`
		// read forces a layout of the whole table during React's commit. `observe()`
		// delivers one notification after the browser's own layout, so the same read
		// there costs nothing. Observer callbacks run before paint, so `flushSync`
		// lands the new attributes in the first painted frame.
		const resizeObserver = new ResizeObserver(() => {
			flushSync(checkState);
		});
		resizeObserver.observe(element);
		// Why the tables too: a wider table changes the scroll width but not the size
		// of the scroll container.
		for (const table of tablesRef.current) {
			resizeObserver.observe(table);
		}
		observerRef.current = resizeObserver;

		element.addEventListener("scroll", scheduleCheck, { passive: true });

		return () => {
			cancelAnimationFrame(frameId);
			observerRef.current = null;
			resizeObserver.disconnect();
			element.removeEventListener("scroll", scheduleCheck);
		};
	}, []);

	return { observeContent, ref, state };
}
