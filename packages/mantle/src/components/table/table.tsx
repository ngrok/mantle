import type { ComponentProps, ComponentRef } from "react";
import { forwardRef, useLayoutEffect, useMemo, useRef, useState } from "react";
import { composeRefs } from "../../utils/compose-refs/compose-refs.js";
import { cx } from "../../utils/cx/cx.js";

/**
 * The `<Table.Root>` is the root container element for all `Table`s.
 * It provides styling and additional functionality, such as horizontal overflow
 * detection.
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
 * @see https://mantle.ngrok.com/components/table#tableroot
 */
const Root = forwardRef<ComponentRef<"div">, ComponentProps<"div">>(
	({ children, className, ...props }, ref) => {
		const horizontalOverflow = useHorizontalOverflowObserver<ComponentRef<"div">>();

		return (
			<div
				data-slot="table"
				className={cx(
					"group/table relative w-full overflow-hidden rounded-lg border border-card bg-white dark:bg-gray-100",
					className,
				)}
				data-sticky-active={
					(horizontalOverflow.state.hasOverflow && !horizontalOverflow.state.scrolledToEnd) ||
					undefined
				}
				data-x-overflow={horizontalOverflow.state.hasOverflow}
				data-x-scroll-end={
					horizontalOverflow.state.hasOverflow && horizontalOverflow.state.scrolledToEnd
				}
				{...props}
			>
				<div
					className={cx(
						"scrollbar scroll-fade-x overflow-x-auto overflow-y-clip overscroll-x-none",
						// When the table contains a sticky right column (e.g., DataTable.ActionCell
						// / DataTable.ActionHeader), suppress the container's right-side fade so the
						// pinned column stays fully opaque. The pinned column provides its own
						// left-side gradient for the scroll-under effect.
						"has-data-mantle-table-sticky-right:[--_fade-right:black]",
					)}
					data-scroll-left={
						(horizontalOverflow.state.hasOverflow && !horizontalOverflow.state.scrolledToStart) ||
						undefined
					}
					data-scroll-right={
						(horizontalOverflow.state.hasOverflow && !horizontalOverflow.state.scrolledToEnd) ||
						undefined
					}
					ref={composeRefs(horizontalOverflow.ref, ref)}
				>
					{children}
				</div>
			</div>
		);
	},
);
Root.displayName = "TableRoot";

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
 * @see https://mantle.ngrok.com/components/table#tableelement
 */
const Element = forwardRef<ComponentRef<"table">, ComponentProps<"table">>(
	({ children, className, ...props }, ref) => {
		return (
			<table
				data-slot="table-element"
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
	},
);
Element.displayName = "TableElement";

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
 * @see https://mantle.ngrok.com/components/table#tableheader
 */
const Head = forwardRef<ComponentRef<"thead">, ComponentProps<"thead">>(
	({ children, className, ...props }, ref) => (
		<thead
			data-slot="table-head"
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
	),
);
Head.displayName = "TableHead";

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
 * @see https://mantle.ngrok.com/components/table#tablebody
 */
const Body = forwardRef<ComponentRef<"tbody">, ComponentProps<"tbody">>(
	({ children, className, ...props }, ref) => (
		<tbody
			data-slot="table-body"
			className={cx(
				//,
				// In border-separate, <tr>/<tbody> borders don't render, so apply
				// dividers directly to cells.
				"[&>tr+tr>*]:border-t [&>tr+tr>*]:border-card-muted",
				"text-body",
				"[&>tr]:bg-card [&>tr]:not-only:hover:bg-card-hover", // Body row styling
				className,
			)}
			ref={ref}
			{...props}
		>
			{children}
		</tbody>
	),
);
Body.displayName = "TableBody";

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
 * @see https://mantle.ngrok.com/components/table#tablefoot
 */
const Foot = forwardRef<ComponentRef<"tfoot">, ComponentProps<"tfoot">>(
	({ children, className, ...props }, ref) => (
		<tfoot
			data-slot="table-foot"
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
	),
);
Foot.displayName = "TableFoot";

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
 * @see https://mantle.ngrok.com/components/table#tablerow
 */
const Row = forwardRef<ComponentRef<"tr">, ComponentProps<"tr">>(
	({ children, className, ...props }, ref) => (
		<tr
			data-slot="table-row"
			ref={ref}
			className={cx(
				// This could be removed, or simplified
				className,
			)}
			{...props}
		>
			{children}
		</tr>
	),
);
Row.displayName = "TableRow";

/**
 * The `<Table.Header>` defines a cell as the header of a group of table cells
 * and may be used as a child of a `<Table.Row>`. The exact nature of this group
 * is defined by the scope and headers attributes.
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
 * @see https://mantle.ngrok.com/components/table#tableheader
 */
const Header = forwardRef<ComponentRef<"th">, ComponentProps<"th">>(
	({ children, className, ...props }, ref) => (
		<th
			data-slot="table-header"
			ref={ref}
			className={cx(
				"h-11 px-4 text-left align-middle text-sm font-medium [&:has([role=checkbox])]:pr-0",
				className,
			)}
			{...props}
		>
			{children}
		</th>
	),
);
Header.displayName = "TableHeader";

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
 * @see https://mantle.ngrok.com/components/table#tablecell
 */
const Cell = forwardRef<ComponentRef<"td">, ComponentProps<"td">>(
	({ children, className, ...props }, ref) => (
		<td
			data-slot="table-cell"
			ref={ref}
			className={cx(
				"p-3 align-middle [&:has([role=checkbox])]:pr-0 font-mono text-mono",
				className,
			)}
			{...props}
		>
			{children}
		</td>
	),
);
Cell.displayName = "TableCell";

/**
 * The optional `<Table.Caption>` specifies the caption (or title) of a table,
 * providing the table an accessible description.
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
 * @see https://mantle.ngrok.com/components/table#tablecaption
 */
const Caption = forwardRef<ComponentRef<"caption">, ComponentProps<"caption">>(
	({ children, className, ...props }, ref) => (
		<caption
			data-slot="table-caption"
			ref={ref}
			className={cx("py-4 text-sm text-gray-500", "border-t border-card-muted", className)}
			{...props}
		>
			{children}
		</caption>
	),
);
Caption.displayName = "TableCaption";

/**
 * A structured way to display data in rows and columns. The API matches the
 * HTML table element 1:1.
 *
 * @see https://mantle.ngrok.com/components/table
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
 */
const Table = {
	/**
	 * The body section of the table. Encapsulates a set of table rows comprising the body of a table's main data.
	 *
	 * @see https://mantle.ngrok.com/components/table#tablebody
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
	 */
	Body,
	/**
	 * An optional caption that specifies the caption (or title) of a table, providing an accessible description.
	 *
	 * @see https://mantle.ngrok.com/components/table#tablecaption
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
	 */
	Caption,
	/**
	 * A cell that contains data and may be used as a child of a table row.
	 *
	 * @see https://mantle.ngrok.com/components/table#tablecell
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
	 */
	Cell,
	/**
	 * A structured way to display data in rows and columns. The API matches the HTML table element 1:1.
	 *
	 * @see https://mantle.ngrok.com/components/table#tableelement
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
	 */
	Element,
	/**
	 * The foot section of a table. Encapsulates a set of table rows comprising the foot with summary information.
	 *
	 * @see https://mantle.ngrok.com/components/table#tablefoot
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
	 */
	Foot,
	/**
	 * The head section of a table. Contains the table's column headers information.
	 *
	 * @see https://mantle.ngrok.com/components/table#tableheader
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
	 */
	Head,
	/**
	 * A cell that defines the header of a group of table cells as a child of a table row.
	 *
	 * @see https://mantle.ngrok.com/components/table#tableheader
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
	 */
	Header,
	/**
	 * The root container element for all tables. Provides styling and additional functionality like horizontal overflow detection.
	 *
	 * @see https://mantle.ngrok.com/components/table#tableroot
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
	 */
	Root,
	/**
	 * Defines a row of cells in a table. Contains a mix of table cells and table headers.
	 *
	 * @see https://mantle.ngrok.com/components/table#tablerow
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
	 */
	Row,
} as const;

export {
	//,
	Table,
};

/**
 * A custom hook that observes the horizontal overflow of an element and determines
 * if it has overflow and if it is scrolled to the end.
 *
 * @private
 */
function useHorizontalOverflowObserver<T extends HTMLElement>() {
	const ref = useRef<T | null>(null);
	const [state, setState] = useState({
		hasOverflow: false,
		scrolledToStart: true,
		scrolledToEnd: false,
	});

	useLayoutEffect(() => {
		const element = ref.current;
		if (!element) {
			return;
		}

		let frameId = 0;

		const checkState = () => {
			const hasOverflow = element.scrollWidth > element.clientWidth;
			const scrolledToStart = element.scrollLeft < 1;
			const scrolledToEnd =
				Math.abs(element.scrollWidth - element.scrollLeft - element.clientWidth) < 1;

			setState((previous) => {
				if (
					previous.hasOverflow !== hasOverflow ||
					previous.scrolledToStart !== scrolledToStart ||
					previous.scrolledToEnd !== scrolledToEnd
				) {
					return { hasOverflow, scrolledToStart, scrolledToEnd };
				}
				return previous; // No state change
			});
		};

		// Coalesce rapid-fire events (scroll, mutation, resize) into a single
		// layout read per animation frame to avoid redundant work.
		const scheduleCheck = () => {
			if (frameId === 0) {
				frameId = requestAnimationFrame(() => {
					frameId = 0;
					checkState();
				});
			}
		};

		const resizeObserver = new ResizeObserver(scheduleCheck);
		resizeObserver.observe(element);

		const mutationObserver = new MutationObserver(scheduleCheck);
		mutationObserver.observe(element, { childList: true, subtree: true });

		element.addEventListener("scroll", scheduleCheck, { passive: true });

		checkState();

		return () => {
			cancelAnimationFrame(frameId);
			resizeObserver.disconnect();
			mutationObserver.disconnect();
			element.removeEventListener("scroll", scheduleCheck);
		};
	}, []);

	return useMemo(() => ({ ref, state }), [state]);
}
