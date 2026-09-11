// Why `Subscribe` boundaries: TanStack Table v9 keeps its core `row`, `column`,
// and `header` objects referentially stable and reads state through their
// methods. A compiled part that receives only those objects as props memoizes
// on the stable prop, so it never calls the method again and serves stale
// state. Per TanStack's React Compiler guide, each such part (`Header`, `Row`,
// `HeaderSortButton`, `RowExpandButton`, `ExpandedRow`) reads the changing
// state inside a `Subscribe` render function, which the store re-runs when
// the selected value changes. Parts that read the React-facing `table` from
// context need no boundary: `useTable` returns a new value with each state
// change the consumer's selector includes.
import { MinusIcon } from "@phosphor-icons/react/Minus";
import { PlusIcon } from "@phosphor-icons/react/Plus";
import {
	type CellData,
	type Column,
	type Column_RowSorting,
	type Row as TableRow,
	type RowData,
	type Row_RowExpanding,
	type StockFeatures,
	Subscribe,
	type Table as TableInstance,
	type TableFeatures,
	callMemoOrStaticFn,
	flexRender,
} from "@tanstack/react-table";
import {
	column_getIsSorted,
	row_getIsExpanded,
	row_getVisibleCells,
	table_getVisibleLeafColumns,
} from "@tanstack/react-table/static-functions";
import {
	type ComponentProps,
	Fragment,
	type MouseEvent,
	type ReactNode,
	createContext,
	useContext,
	useMemo,
} from "react";
import invariant from "tiny-invariant";
import { cx } from "../../utils/cx/cx.js";
import type { SortingMode } from "../../utils/sorting/direction.js";
import { Button, type ButtonAppearance } from "../button/button.js";
import {
	IconButton,
	type IconButtonAppearance,
	type IconButtonIntent,
} from "../button/icon-button.js";
import type { ButtonIntent } from "../button/intents.js";
import type { SvgAttributes } from "../icon/types.js";
import { SortIcon } from "../icons/sort.js";
import { sandboxedOnClickProps } from "../sandboxed-on-click/sandboxed-on-click.js";
import { Table } from "../table/table.js";
import { getNextSortDirection } from "./helpers.js";
import type { SortDirection } from "./types.js";

/**
 * The table features a sortable column needs. `DataTable.HeaderSortButton`
 * calls the column's sorting API, which exists only when the table registers
 * `rowSortingFeature`.
 */
type SortableTableFeatures = Pick<StockFeatures, "rowSortingFeature">;

/**
 * The table features an expandable row needs. `DataTable.RowExpandButton`
 * calls the row's expansion API, which exists only when the table registers
 * `rowExpandingFeature`.
 */
type ExpandableTableFeatures = Pick<StockFeatures, "rowExpandingFeature">;

// Why the intersections: TypeScript cannot resolve a feature method on
// `Column<TFeatures, …>` or `Row<TFeatures, …>` while `TFeatures` is generic,
// even under the constraint above. The intersection names the feature API so
// the body can call it; the constraint puts the feature in the signature and
// in the first line of a consumer's error. The alias omits `TableFeatures &`
// on purpose: with it, `Column<SortableTableFeatures, …>` claims every optional
// feature and the error's last line names faceting instead of sorting.
// See decisions/2026-09-10-data-table-tanstack-v9-feature-typing.md.

/** A column from a table that registers `rowSortingFeature`. */
type SortableColumn<
	TFeatures extends SortableTableFeatures,
	TData extends RowData,
	TValue extends CellData,
> = Column<TFeatures, TData, TValue> & Column_RowSorting<TFeatures, TData>;

/** A row from a table that registers `rowExpandingFeature`. */
type ExpandableRow<TFeatures extends ExpandableTableFeatures, TData extends RowData> = TableRow<
	TFeatures,
	TData
> &
	Row_RowExpanding;

type DataTableContextShape<TFeatures extends TableFeatures, TData extends RowData> = {
	table: TableInstance<TFeatures, TData>;
};

// oxlint-disable-next-line @typescript-eslint/no-explicit-any -- React context cannot preserve these generics across provider boundaries.
const DataTableContext = createContext<DataTableContextShape<any, any> | null>(null);

/**
 * @private
 */
function useDataTableContext<
	TFeatures extends TableFeatures = TableFeatures,
	TData extends RowData = RowData,
>() {
	const context = useContext(DataTableContext);

	invariant(context, "useDataTableContext should only be used within a DataTable child component");

	return context as DataTableContextShape<TFeatures, TData>;
}

type DataTableProps<TFeatures extends TableFeatures, TData extends RowData> = ComponentProps<
	typeof Table.Root
> & {
	/**
	 * The TanStack Table instance from `useTable`. Every other `DataTable` part
	 * reads it through context.
	 */
	table: TableInstance<TFeatures, TData>;
};

/**
 * The root container for a data table. Wraps all other `DataTable`
 * sub-components and provides the table context to its descendants.
 *
 * REQUIRED: Construct a TanStack Table instance via `useTable` (from
 * `@tanstack/react-table`, also re-exported from `@ngrok/mantle/data-table`)
 * and pass it through the `table` prop. The instance owns columns, data, and
 * any sorting / filtering / pagination state — the wrapper components read
 * from it.
 *
 * @see https://mantle.ngrok.com/components/data-display/data-table#datatableroot
 *
 * @example
 * ```tsx
 * import {
 *   DataTable,
 *   createColumnHelper,
 *   tableFeatures,
 *   useTable,
 * } from "@ngrok/mantle/data-table";
 *
 * type Row = { id: string; name: string };
 * const features = tableFeatures({});
 * const columnHelper = createColumnHelper<typeof features, Row>();
 * const columns = columnHelper.columns([
 *   columnHelper.accessor("name", {
 *     id: "name",
 *     header: () => <DataTable.Header>Name</DataTable.Header>,
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
 */
function Root<TFeatures extends TableFeatures, TData extends RowData>({
	children,
	table,
	...props
}: DataTableProps<TFeatures, TData>) {
	const context: DataTableContextShape<TFeatures, TData> = useMemo(() => ({ table }), [table]);

	return (
		<DataTableContext.Provider value={context}>
			<Table.Root data-slot="data-table" {...props}>
				<Table.Element>{children}</Table.Element>
			</Table.Root>
		</DataTableContext.Provider>
	);
}

type DataTableHeaderSortButtonProps<
	TFeatures extends SortableTableFeatures,
	TData extends RowData,
	TValue extends CellData,
> = Omit<ComponentProps<typeof Button>, "appearance" | "icon" | "intent"> & {
	/**
	 * The TanStack Table column this button sorts (`props.column` in `header`).
	 * The table must register `rowSortingFeature`.
	 */
	column: SortableColumn<TFeatures, TData, TValue>;
	/**
	 * The visual style of the sort button. Optional — the header sort button's
	 * design is a ghost button, so the wrapper defaults it.
	 * @default "ghost"
	 */
	appearance?: ButtonAppearance;
	/**
	 * The tone of the sort button. Optional — the header sort button's design
	 * is neutral-toned, so the wrapper defaults it.
	 * @default "neutral"
	 */
	intent?: ButtonIntent;
} & (
		| {
				/**
				 * Disable sorting for this column.
				 * It will prevent the sorting direction from being toggled and any icon
				 * from being shown.
				 */
				disableSorting: true;
				/**
				 * Use this to render a custom sort icon for the column if it is sortable
				 * and you want to override the default sort icon
				 */
				sortIcon?: undefined;
				/**
				 * The sorting mode of the column, whether it is alphanumeric or time based.
				 */
				sortingMode?: undefined;
		  }
		| {
				disableSorting?: false;
				/**
				 * Use this to render a custom sort icon for the column if it is sortable
				 * and you want to override the default sort icon
				 */
				sortIcon?: (sortDirection: SortDirection) => ReactNode;
				/**
				 * The sorting mode of the column, whether it is alphanumeric or time based.
				 */
				sortingMode: SortingMode;
		  }
	);

/**
 * A sortable button toggle for a column header in a data table. Renders a sort
 * icon that reflects the current direction and cycles through sort states on
 * click. The button's accessible name is the column label and does not change
 * with the sort state; pass `column` to the surrounding `DataTable.Header` so
 * the header cell exposes the state through `aria-sort`.
 *
 * Each click cycles through:
 * - For `"alphanumeric"` sorting: `unsorted → ascending → descending → unsorted`
 * - For `"time"` sorting: `unsorted → newest-first → oldest-first → unsorted`
 *
 * The table must register `rowSortingFeature`; the `column` prop's type rejects a
 * column from a table without it. Pair it with `sortedRowModel: createSortedRowModel()`,
 * or the button toggles the icon and never reorders a row. Register a `sortFns` slot
 * too: without one, auto-sort falls back to `sortFn_basic`.
 *
 * When the column cannot sort (`disableSorting`, or `enableSorting: false` on
 * the column), the part renders the label as plain text in a `<span>`: no
 * button, no icon. The other props, `ref` included, land on that span.
 * `onClick` does not, because plain text takes no click.
 *
 * For right-aligned numeric columns, pass `className="justify-end"` and
 * `iconPlacement="start"` so the sort icon stays paired with the label.
 *
 * | Data Attribute             | Value                              | Description                                                                                                                 |
 * | -------------------------- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
 * | `data-sort-direction`      | `"asc"`, `"desc"`, or `"unsorted"` | The column's current sort direction. Always `"unsorted"` on the plain-text span.                                            |
 * | `data-table-header-action` | present on the button              | Presence-only. `DataTable.Header` drops its horizontal padding when a descendant carries it. Absent on the plain-text span. |
 *
 * @see https://mantle.ngrok.com/components/data-display/data-table#datatableheadersortbutton
 *
 * @example
 * ```tsx
 * const features = tableFeatures({
 *   rowSortingFeature,
 *   sortedRowModel: createSortedRowModel(),
 *   sortFns: {
 *     alphanumeric: sortFn_alphanumeric,
 *     datetime: sortFn_datetime,
 *     text: sortFn_text,
 *   },
 * });
 * const columnHelper = createColumnHelper<typeof features, Row>();
 *
 * columnHelper.accessor("email", {
 *   id: "email",
 *   header: (props) => (
 *     <DataTable.Header column={props.column}>
 *       <DataTable.HeaderSortButton column={props.column} sortingMode="alphanumeric">
 *         Email
 *       </DataTable.HeaderSortButton>
 *     </DataTable.Header>
 *   ),
 *   cell: (props) => <DataTable.Cell>{props.getValue()}</DataTable.Cell>,
 * });
 * ```
 */
function HeaderSortButton<
	TFeatures extends SortableTableFeatures,
	TData extends RowData,
	TValue extends CellData,
>({
	appearance = "ghost",
	children,
	className,
	column,
	disableSorting = false,
	iconPlacement = "end",
	intent = "neutral",
	sortingMode,
	sortIcon: propSortIcon,
	onClick,
	...props
}: DataTableHeaderSortButtonProps<TFeatures, TData, TValue>) {
	const renderSortButton = () => {
		const rawSortDirection = column.getIsSorted();
		const canSort = !disableSorting && column.getCanSort();

		const sortDirection: SortDirection =
			canSort && typeof rawSortDirection === "string" ? rawSortDirection : "unsorted";

		if (!canSort) {
			// Why a span: a button that does nothing on click is a focusable dead end
			// for a keyboard user. `justify-*` and text classes still apply.
			return (
				<span
					data-slot="data-table-header-sort-button"
					data-sort-direction="unsorted"
					className={cx(
						"flex w-full items-center justify-start",
						appearance === "ghost" && intent === "neutral" && "text-muted",
						className,
					)}
					{...props}
				>
					{children}
				</span>
			);
		}

		const sortIcon = propSortIcon?.(sortDirection) ?? (
			<DefaultSortIcon mode={sortingMode} direction={sortDirection} />
		);

		return (
			<Button
				appearance={appearance}
				data-slot="data-table-header-sort-button"
				className={cx(
					"flex justify-start w-full h-full rounded-none not-disabled:active:scale-none",
					// Only mute the default ghost+neutral design; the consumer className is
					// merged last by tw-merge, so an unconditional text-muted would strip the
					// tone text color from every non-default appearance/intent combination.
					appearance === "ghost" && intent === "neutral" && "text-muted",
					className,
				)}
				data-sort-direction={sortDirection}
				data-table-header-action
				icon={sortIcon}
				iconPlacement={iconPlacement}
				onClick={(event) => {
					onClick?.(event);
					if (event.defaultPrevented) {
						return;
					}
					if (typeof sortingMode === "undefined") {
						return;
					}
					toggleNextSortingDirection(column, sortingMode);
				}}
				intent={intent}
				type="button"
				{...props}
			>
				{children}
			</Button>
		);
	};

	// The selector reads the column's sort state, so the button re-renders only when
	// this column's direction changes.
	return (
		<Subscribe source={column.table.store} selector={() => column.getIsSorted()}>
			{renderSortButton}
		</Subscribe>
	);
}

type DataTableHeaderProps<
	TFeatures extends TableFeatures,
	TData extends RowData,
	TValue extends CellData,
> = ComponentProps<typeof Table.Header> & {
	/**
	 * The TanStack Table column this cell heads (`props.column` in `header`).
	 * When the column is sorted, the cell carries `aria-sort`.
	 */
	column?: Column<TFeatures, TData, TValue>;
};

/**
 * The `aria-sort` value for a column's current sort state. `undefined` when the
 * column is unsorted or absent, because WAI-ARIA asks authors to set
 * `aria-sort` on one header at a time.
 *
 * @example
 * ```ts
 * resolveAriaSort(sortedAscendingColumn); // => "ascending"
 * resolveAriaSort(unsortedColumn); // => undefined
 * ```
 */
function resolveAriaSort<
	TFeatures extends TableFeatures,
	TData extends RowData,
	TValue extends CellData,
>(column: Column<TFeatures, TData, TValue> | undefined): "ascending" | "descending" | undefined {
	if (column == null) {
		return undefined;
	}
	// Why callMemoOrStaticFn: `getIsSorted` exists on the column only when the
	// table registers `rowSortingFeature`. The static function reads the same
	// state and reports `false` for a table that cannot sort.
	const sorted = callMemoOrStaticFn(column, "getIsSorted", column_getIsSorted);
	if (sorted === "asc") {
		return "ascending";
	}
	if (sorted === "desc") {
		return "descending";
	}
	return undefined;
}

/**
 * A `<th>` optimized for header actions. Wrap each column's header content in
 * this; for sortable columns, nest a `DataTable.HeaderSortButton` inside and
 * pass the same `column` here, so the cell carries `aria-sort` while the column
 * is sorted. Non-sortable columns can render plain text.
 *
 * @see https://mantle.ngrok.com/components/data-display/data-table#datatableheader
 *
 * @example
 * ```tsx
 * columnHelper.accessor("name", {
 *   id: "name",
 *   header: (props) => (
 *     <DataTable.Header column={props.column}>
 *       <DataTable.HeaderSortButton column={props.column} sortingMode="alphanumeric">
 *         Name
 *       </DataTable.HeaderSortButton>
 *     </DataTable.Header>
 *   ),
 *   cell: (props) => <DataTable.Cell>{props.getValue()}</DataTable.Cell>,
 * });
 * ```
 */
function Header<TFeatures extends TableFeatures, TData extends RowData, TValue extends CellData>({
	children,
	className,
	column,
	...props
}: DataTableHeaderProps<TFeatures, TData, TValue>) {
	const renderHeader = () => (
		<Table.Header
			aria-sort={resolveAriaSort(column)}
			data-slot="data-table-header"
			className={cx("has-data-table-header-action:px-0", className)}
			{...props}
		>
			{children}
		</Table.Header>
	);

	if (column == null) {
		return renderHeader();
	}

	// The selector resolves the `aria-sort` value, so the cell re-renders only when
	// this column's sort state changes.
	return (
		<Subscribe source={column.table.store} selector={() => resolveAriaSort(column)}>
			{renderHeader}
		</Subscribe>
	);
}

/**
 * The `<tbody>` container for rows of data. Typically wraps a map of
 * `DataTable.Row`, with a `DataTable.EmptyRow` fallback when there is no data.
 *
 * @see https://mantle.ngrok.com/components/data-display/data-table#datatablebody
 *
 * @example
 * ```tsx
 * const table = useTable({ features, data, columns });
 * const rows = table.getRowModel().rows;
 *
 * <DataTable.Root table={table}>
 *   <DataTable.Head />
 *   <DataTable.Body>
 *     {rows.length > 0
 *       ? rows.map((row) => <DataTable.Row key={row.id} row={row} />)
 *       : <DataTable.EmptyRow>No results.</DataTable.EmptyRow>}
 *   </DataTable.Body>
 * </DataTable.Root>
 * ```
 */
const Body = (props: ComponentProps<typeof Table.Body>) => (
	<Table.Body data-slot="data-table-body" {...props} />
);

type DataTableHeadProps = Omit<ComponentProps<typeof Table.Head>, "children">;

/**
 * The `<thead>` container that renders column headers automatically from
 * `table.getHeaderGroups()`. Does not accept children — headers come from each
 * column's `header` definition on the TanStack Table column config.
 *
 * @see https://mantle.ngrok.com/components/data-display/data-table#datatablehead
 *
 * @example
 * ```tsx
 * const table = useTable({ features, data, columns });
 * const rows = table.getRowModel().rows;
 *
 * <DataTable.Root table={table}>
 *   <DataTable.Head />
 *   <DataTable.Body>
 *     {rows.length > 0
 *       ? rows.map((row) => <DataTable.Row key={row.id} row={row} />)
 *       : <DataTable.EmptyRow>No results.</DataTable.EmptyRow>}
 *   </DataTable.Body>
 * </DataTable.Root>
 * ```
 */
function Head(props: DataTableHeadProps) {
	const { table } = useDataTableContext();

	return (
		<Table.Head data-slot="data-table-head" {...props}>
			{table.getHeaderGroups().map((headerGroup) => (
				<Table.Row key={headerGroup.id}>
					{headerGroup.headers.map((header) => (
						<Fragment key={header.id}>
							{header.isPlaceholder ? (
								<Table.Header />
							) : (
								flexRender(header.column.columnDef.header, header.getContext())
							)}
						</Fragment>
					))}
				</Table.Row>
			))}
		</Table.Head>
	);
}

type DataTableRowProps<TFeatures extends TableFeatures, TData extends RowData> = Omit<
	ComponentProps<typeof Table.Row>,
	"children"
> & {
	/** The TanStack Table row instance to render. */
	row: TableRow<TFeatures, TData>;
	/**
	 * Renders an inline detail panel beneath the row. Called only while the row is
	 * expanded (`row.getIsExpanded()`), so the panel — and any expensive work it
	 * does — stays lazy. Mantle wraps the returned content in a sibling
	 * `DataTable.ExpandedRow` spanning every visible column, so return the
	 * panel content (not a `<tr>`). Requires the table to register
	 * `rowExpandingFeature`, plus `getRowCanExpand` for detail panels; pair it
	 * with a `DataTable.RowExpandButton` toggle in a leading column. Add
	 * `expandedRowModel: createExpandedRowModel()` when rows have sub-rows. For
	 * full control over the detail row (custom `colSpan`,
	 * multiple panels), omit this and render `DataTable.ExpandedRow` yourself.
	 */
	renderExpanded?: (row: TableRow<TFeatures, TData>) => ReactNode;
};

/**
 * Whether a click on a clickable row is a request to run its `onClick`. A
 * modified click (`⌘`, `Ctrl`, `Shift`, `Alt`) or a non-primary button asks the
 * browser for a new tab or a context menu. The link inside the row answers
 * that. A click that ends a text selection inside the row copies text.
 */
function isRowActivationClick(event: MouseEvent<HTMLTableRowElement>): boolean {
	if (event.button !== 0) {
		return false;
	}
	if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
		return false;
	}
	// Why `ownerDocument`: a row inside an iframe (a framed docs preview) selects
	// in its own document, not in the top window's.
	const selection = event.currentTarget.ownerDocument.getSelection();
	if (selection == null || selection.isCollapsed) {
		return true;
	}
	// A stale selection elsewhere on the page survives a mousedown on
	// non-selectable content, so only a selection anchored in this row counts.
	return !event.currentTarget.contains(selection.anchorNode);
}

/**
 * A single data table body row rendered from a TanStack Table row instance.
 * Does not accept children — cells come from each column's `cell` definition.
 *
 * When `onClick` is set, the row receives `cursor-pointer` and `data-clickable`.
 * Pass a different `cursor-*` class via `className` (e.g. `cursor-default`,
 * `cursor-wait`) to override the cursor. The row runs `onClick` only for a
 * plain primary click. A modified click (`⌘`, `Ctrl`, `Shift`, `Alt`), a
 * non-primary button, and a click that ends a text selection inside the row
 * all skip it. The link inside the row answers a modified click with a new
 * tab, and a selection copies text, so neither is a request to navigate.
 *
 * A `<tr>` is not focusable, so also render a `<Link>` inside the primary cell.
 * The link is the keyboard and screen-reader path to the same destination, not
 * a redundancy. The row keeps its structural `role="row"`: a `<tr onClick>`
 * around a link is not nested interactive content, because the row has no
 * widget role. Never add `tabIndex` or `role="button"` to the row, because a
 * widget role that contains a focusable link is nested interactive content.
 * Never reach for `role="grid"`, because it commits the table to roving focus
 * and arrow-key navigation. Wrap the link in
 * `<SandboxedOnClick asChild allowClickEventDefault>` so its click does not
 * also run the row handler. `DataTable.ActionCell` and
 * `DataTable.RowExpandButton` stop their own clicks.
 *
 * Pass `renderExpanded` to give the row an inline detail panel: when the row is
 * expanded the row renders its data `<tr>` plus a sibling `DataTable.ExpandedRow`
 * holding the returned content. Pair it with a `DataTable.RowExpandButton` toggle
 * and register `rowExpandingFeature` and `getRowCanExpand` on the table.
 *
 * The row subscribes to the whole table state and re-renders its cells when any
 * slice changes, so a column's `cell` renderer can read state through `row` or
 * `cell` (`row.getIsSelected()`) without its own subscription. A re-render of
 * the parent with the same `row` does not re-render the cells.
 *
 * | Data Attribute   | Value                         | Description                                             |
 * | ---------------- | ----------------------------- | ------------------------------------------------------- |
 * | `data-clickable` | present when `onClick` is set | Presence-only. The row runs a handler on a plain click. |
 * | `data-expanded`  | present when expanded         | Presence-only. The row's detail panel is open.          |
 *
 * @see https://mantle.ngrok.com/components/data-display/data-table#datatablerow
 *
 * @example
 * Clickable row navigating to a detail page:
 * ```tsx
 * const navigate = useNavigate();
 *
 * {rows.map((row) => (
 *   <DataTable.Row
 *     key={row.id}
 *     row={row}
 *     onClick={() => navigate(href("/payments/:id", { id: row.original.id }))}
 *   />
 * ))}
 * ```
 *
 * @example
 * Expandable row with an inline JSON detail panel (lazy — only built when open):
 * ```tsx
 * import { CodeBlock, jsonCodeBlockValue } from "@ngrok/mantle/code-block";
 *
 * {rows.map((row) => (
 *   <DataTable.Row
 *     key={row.id}
 *     row={row}
 *     renderExpanded={(row) => (
 *       <CodeBlock.Root>
 *         <CodeBlock.Body>
 *           <CodeBlock.CopyButton />
 *           <CodeBlock.Code value={jsonCodeBlockValue(row.original)} />
 *         </CodeBlock.Body>
 *       </CodeBlock.Root>
 *     )}
 *   />
 * ))}
 * ```
 */
function Row<TFeatures extends TableFeatures, TData extends RowData>({
	className,
	onClick,
	renderExpanded,
	row,
	...props
}: DataTableRowProps<TFeatures, TData>) {
	const renderRow = () => {
		// Why callMemoOrStaticFn: `getIsExpanded` and `getVisibleCells` exist on the
		// row only when the table registers `rowExpandingFeature` and
		// `columnVisibilityFeature`. The static functions read the same state, so a
		// table without those features renders every cell and never expands.
		const isExpanded = callMemoOrStaticFn(row, "getIsExpanded", row_getIsExpanded);
		const cells = callMemoOrStaticFn(row, "getVisibleCells", row_getVisibleCells);

		const dataRow = (
			<Table.Row
				data-slot="data-table-row"
				// Styling hook for the "this row is expanded" state (e.g. to pair the
				// parent row visually with its `DataTable.ExpandedRow`). Absent when the
				// row is collapsed or expansion is not configured.
				data-expanded={isExpanded || undefined}
				// Styling and test hook for "this row runs a handler on click", so a
				// consumer never has to read `cursor-pointer` off the class list.
				data-clickable={onClick != null ? "" : undefined}
				className={cx(onClick != null && "cursor-pointer", className)}
				onClick={
					onClick &&
					((event) => {
						if (isRowActivationClick(event)) {
							onClick(event);
						}
					})
				}
				{...props}
			>
				{cells.map((cell) => (
					// Why flexRender, not FlexRender: the column's `cell` definition owns
					// the `<td>`. `FlexRender` renders `null` for a grouped row's
					// placeholder cells, which would drop their `<td>` and shift every cell
					// after them one column to the left.
					<Fragment key={cell.id}>
						{flexRender(cell.column.columnDef.cell, cell.getContext())}
					</Fragment>
				))}
			</Table.Row>
		);

		// Without `renderExpanded`, behave exactly as a plain single-`<tr>` row.
		if (renderExpanded == null) {
			return dataRow;
		}

		// With it, render the data row plus — only while expanded — its detail row.
		// `renderExpanded` is called lazily so collapsed rows pay nothing.
		return (
			<>
				{dataRow}
				{isExpanded && <ExpandedRow row={row}>{renderExpanded(row)}</ExpandedRow>}
			</>
		);
	};

	// Why the whole state: a column's `cell` renderer is opaque to this row and
	// may read any slice through `row` or `cell`, so the row re-renders its cells
	// on every state change, as an uncompiled row did. The selector returns the
	// state object, and a shallow compare of its slices decides the re-render.
	return (
		<Subscribe source={row.table.store} selector={(state) => state}>
			{renderRow}
		</Subscribe>
	);
}

type DataTableEmptyRowProps = ComponentProps<typeof Table.Row>;

/**
 * An empty-state row that spans every column. Render this as the `else` branch
 * when `rows.length === 0` to keep the table's frame intact instead of
 * collapsing to an empty `<tbody>`. The cell `colSpan` is computed from the
 * TanStack Table instance via context, so no manual column count is needed.
 *
 * Host an `Empty` for a real empty state, and branch on whether a filter is
 * active so the user sees the right message (and a way out when filtered):
 *
 * @see https://mantle.ngrok.com/components/data-display/data-table#datatableemptyrow
 * @see https://mantle.ngrok.com/components/feedback/empty
 *
 * @example
 * ```tsx
 * import { DataTable } from "@ngrok/mantle/data-table";
 * import { Empty } from "@ngrok/mantle/empty";
 * import { Button } from "@ngrok/mantle/button";
 * import { MagnifyingGlassIcon } from "@phosphor-icons/react/MagnifyingGlass";
 * import { TrayIcon } from "@phosphor-icons/react/Tray";
 *
 * // `table` is your useTable instance; derive everything else from it.
 * const rows = table.getRowModel().rows;
 * const isFiltered = (table.state.globalFilter ?? "") !== "";
 *
 * // EmptyRow already spans every column and Empty.Root centers itself — drop a
 * // single Empty.Root in as the child; don't hand-roll a <td> or any centering.
 * <DataTable.Body>
 *   {rows.length > 0 ? (
 *     rows.map((row) => <DataTable.Row key={row.id} row={row} />)
 *   ) : isFiltered ? (
 *     <DataTable.EmptyRow>
 *       <Empty.Root>
 *         <Empty.Icon svg={<MagnifyingGlassIcon />} />
 *         <Empty.Title>No results match your filter</Empty.Title>
 *         <Empty.Actions>
 *           <Button
 *             type="button"
 *             appearance="outlined"
 *             intent="neutral"
 *             onClick={() => table.setGlobalFilter("")}
 *           >
 *             Clear filters
 *           </Button>
 *         </Empty.Actions>
 *       </Empty.Root>
 *     </DataTable.EmptyRow>
 *   ) : (
 *     <DataTable.EmptyRow>
 *       <Empty.Root>
 *         <Empty.Icon svg={<TrayIcon />} />
 *         <Empty.Title>No endpoints yet</Empty.Title>
 *       </Empty.Root>
 *     </DataTable.EmptyRow>
 *   )}
 * </DataTable.Body>
 * ```
 */
function EmptyRow({ children, ...props }: DataTableEmptyRowProps) {
	const { table } = useDataTableContext();
	// Why callMemoOrStaticFn: `getVisibleLeafColumns` exists on the table only
	// when it registers `columnVisibilityFeature`. The static function counts
	// every leaf column for a table that cannot hide columns.
	const numberOfColumns = callMemoOrStaticFn(
		table,
		"getVisibleLeafColumns",
		table_getVisibleLeafColumns,
	).length;

	return (
		<Table.Row data-slot="data-table-empty-row" {...props}>
			<Table.Cell colSpan={numberOfColumns}>{children}</Table.Cell>
		</Table.Row>
	);
}

/**
 * Internal: renders the visual indicator on the left edge of the sticky action
 * column — a 1px divider plus a soft shadow gradient that reads as content
 * sliding under the pinned column. Positioned as a 6px strip sitting
 * immediately to the left of its sticky parent cell; `-inset-y-px` lets
 * adjacent rows' strips overlap at row dividers so the effect reads as one
 * continuous column instead of per-row blobs.
 *
 * Rendered as a child `<span>` because box-shadow on `<td>`/`<th>` is
 * unreliable across table layout modes.
 */
function StickyColIndicator() {
	return (
		<span
			aria-hidden
			className={cx(
				"pointer-events-none absolute -inset-y-px -left-1.5 w-1.5",
				"opacity-0 transition-opacity group-data-sticky-active/table:opacity-100",
				// 1px divider painted at the strip's right edge (= the pinned
				// cell's left edge).
				"shadow-[1px_0_0_0_var(--border-color-card-muted)]",
				// Soft shadow gradient fading leftward. Uses mantle's shadow
				// tokens so the alpha adapts to light/dark themes.
				"bg-linear-to-l to-transparent",
				"from-[color-mix(in_oklab,var(--shadow-color)_var(--shadow-second-opacity),transparent)]",
			)}
		/>
	);
}

type DataTableActionCellProps = ComponentProps<typeof Table.Cell>;

/**
 * A sticky-right `<td>` for per-row action buttons (typically an `IconButton`
 * that opens a `DropdownMenu`). Pair with `DataTable.ActionHeader`.
 *
 * A click inside the cell never reaches a clickable row: the cell stops
 * propagation and keeps the click's default action, so an action menu opens
 * without the row navigating. Your own `onClick` still runs. The `<td>` keeps
 * its `role="cell"`.
 *
 * @see https://mantle.ngrok.com/components/data-display/data-table#datatableactioncell
 *
 * @example
 * ```tsx
 * columnHelper.display({
 *   id: "actions",
 *   header: () => <DataTable.ActionHeader />,
 *   cell: () => (
 *     <DataTable.ActionCell>
 *       <DropdownMenu.Root>...</DropdownMenu.Root>
 *     </DataTable.ActionCell>
 *   ),
 * });
 * ```
 */
function ActionCell({ children, className, onClick, ...props }: DataTableActionCellProps) {
	// Why only `onClick`: `sandboxedOnClickProps` also returns `role="presentation"`,
	// which would drop this `<td>` out of the table's accessibility tree.
	const { onClick: sandboxedOnClick } = sandboxedOnClickProps({
		allowClickEventDefault: true,
		onClick,
	});
	return (
		<Table.Cell
			// Marks this cell as a sticky right-edge column so Table.Root can suppress
			// its container-level right-side scroll fade (keeping this cell opaque).
			data-mantle-table-sticky-right
			data-slot="data-table-action-cell"
			className={cx(
				// `bg-inherit` keeps the sticky cell opaque with the row's current bg
				// (including hover state) so scrolling cells don't show through.
				// Avoid `display: flex` here — it overrides `display: table-cell`,
				// preventing the cell from stretching to the full row height in
				// `border-separate` mode.
				"sticky z-10 right-0 text-end align-middle bg-inherit p-2",
				className,
			)}
			onClick={sandboxedOnClick}
			{...props}
		>
			<StickyColIndicator />
			{children}
		</Table.Cell>
	);
}

type DataTableActionHeaderProps = ComponentProps<typeof Table.Header>;

/**
 * A sticky header cell that pairs with `DataTable.ActionCell`. Use this as the
 * header for the action column so the pinned column visually aligns across the
 * header and every body row when the table scrolls horizontally. Renders a
 * screen-reader-only "Actions" label by default, so the column has a name while
 * it stays visually empty.
 *
 * @see https://mantle.ngrok.com/components/data-display/data-table#datatableactionheader
 *
 * @example
 * ```tsx
 * columnHelper.display({
 *   id: "actions",
 *   header: () => <DataTable.ActionHeader />,
 *   cell: () => <DataTable.ActionCell>{...}</DataTable.ActionCell>,
 * })
 * ```
 */
function ActionHeader({ children, className, ...props }: DataTableActionHeaderProps) {
	const { table } = useDataTableContext();
	const hasRows = table.getRowModel().rows.length > 0;

	return (
		<Table.Header
			// Only mark as sticky-right when body rows exist so the empty state
			// doesn't suppress the container's right-side scroll fade.
			{...(hasRows ? { "data-mantle-table-sticky-right": true } : {})}
			data-slot="data-table-action-header"
			className={cx(
				// `bg-inherit` keeps the sticky header opaque with the thead's current bg.
				hasRows && "sticky z-10 right-0 bg-inherit",
				className,
			)}
			{...props}
		>
			{children ?? <span className="sr-only">Actions</span>}
			{/* Last, not first: the indicator is absolutely positioned outside the
			    cell's content box, so DOM order costs nothing here — and mounting it
			    before `children` would aim an `insertBefore` at header text that a
			    browser translation engine has reparented, which throws. See
			    decisions/2026-08-04-translation-safe-label-wrappers.md. */}
			{hasRows && <StickyColIndicator />}
		</Table.Header>
	);
}

/**
 * Compute the stable DOM `id` for a row's expanded detail row. Shared by
 * `DataTable.RowExpandButton` (as its `aria-controls` target) and
 * `DataTable.ExpandedRow` (as its `id`) so the accessibility association is
 * _derived_ from the row — never synchronized state — and stays correct whether
 * or not the detail panel is currently rendered.
 *
 * REQUIRED: configure the table with a stable `getRowId` so `row.id` (and thus
 * this id) is stable across sorting/filtering/pagination. Any `row.id` value is
 * safe — it is URL-encoded into a valid, whitespace-free HTML id token (and thus
 * a valid `aria-controls` IDREF), so display names with spaces, URLs, and emails
 * all work; `getRowId` controls the value.
 *
 * @example
 * ```tsx
 * <DataTable.RowExpandButton row={row} label={row.original.name} />
 * // ...renders aria-controls={expandedRowId(row)} while expanded, and
 * <DataTable.ExpandedRow row={row}>...</DataTable.ExpandedRow>
 * // ...renders id={expandedRowId(row)} — the same value, so they stay associated.
 * ```
 */
function expandedRowId<TFeatures extends TableFeatures, TData extends RowData>(
	row: TableRow<TFeatures, TData>,
): string {
	// `encodeURIComponent` guarantees a whitespace-free, valid HTML id token (and
	// thus a valid `aria-controls` IDREF) for ANY `getRowId` value — e.g. a display
	// name like "Acme Inc". Both the toggle's `aria-controls` and the expanded
	// row's `id` derive from this one function, so encoding both sides keeps them
	// equal and preserves the accessibility association.
	return `data-table-expanded-row-${encodeURIComponent(row.id)}`;
}

type DataTableExpandHeaderProps = Omit<ComponentProps<typeof Table.Header>, "children"> & {
	/**
	 * Optional header content — e.g. an "expand all" toggle wired to
	 * `table.getToggleAllRowsExpandedHandler()`. Defaults to a screen-reader-only
	 * label so the column is announced while staying visually empty.
	 */
	children?: ReactNode;
};

/**
 * A narrow `<th>` for the leading expand-toggle column, mirroring
 * `DataTable.ActionHeader`. Renders a screen-reader-only label by default so the
 * column is announced to assistive tech while staying visually empty; pass
 * `children` to render an "expand all" control instead.
 *
 * @see https://mantle.ngrok.com/components/data-display/data-table#datatableexpandheader
 *
 * @example
 * ```tsx
 * columnHelper.display({
 *   id: "expander",
 *   header: () => <DataTable.ExpandHeader />,
 *   cell: (props) => (
 *     <DataTable.Cell className="w-9 px-0 text-center">
 *       <DataTable.RowExpandButton row={props.row} label={props.row.original.name} />
 *     </DataTable.Cell>
 *   ),
 * });
 * ```
 */
function ExpandHeader({ children, className, ...props }: DataTableExpandHeaderProps) {
	return (
		<Table.Header
			data-slot="data-table-expand-header"
			// `Table.Header` defaults to `px-4`; zero it (and center) so the column is
			// actually as narrow as `w-9` and aligns with the icon toggle in the cells
			// below it. A consumer `className` still wins via tailwind-merge.
			className={cx("w-9 px-0 text-center", className)}
			{...props}
		>
			{children ?? <span className="sr-only">Row details</span>}
		</Table.Header>
	);
}

// Stable element references for the default toggle icons — defining these inline
// as default prop values would recreate them every render (and trips
// react/no-object-type-as-default-prop). `size-3.5` overrides Icon's default
// `size-5` (the `+`/`−` glyphs fill their full box, so 20px reads oversized for
// a row affordance); the svg's own className wins the cx/tailwind-merge.
const defaultExpandIcon = <PlusIcon weight="bold" className="size-3.5" />;
const defaultCollapseIcon = <MinusIcon weight="bold" className="size-3.5" />;

type DataTableRowExpandButtonProps<
	TFeatures extends ExpandableTableFeatures,
	TData extends RowData,
> = Omit<
	ComponentProps<typeof IconButton>,
	"appearance" | "aria-controls" | "aria-expanded" | "icon" | "intent" | "label"
> & {
	/**
	 * The visual style of the expand toggle. Optional — the row expand button's
	 * design is a ghost button, so the wrapper defaults it.
	 * @default "ghost"
	 */
	appearance?: IconButtonAppearance;
	/**
	 * The tone of the expand toggle. Optional — the row expand button's design
	 * is neutral-toned, so the wrapper defaults it, and it is the only tone
	 * `IconButton` draws.
	 * @default "neutral"
	 */
	intent?: IconButtonIntent;
	/**
	 * The TanStack Table row this button toggles. The table must register
	 * `rowExpandingFeature`, plus `getRowCanExpand: () => true` for custom detail
	 * panels, which have no sub-rows.
	 */
	row: ExpandableRow<TFeatures, TData>;
	/**
	 * A human-readable name for the row, woven into the accessible label:
	 * `Show details for {label}` / `Hide details for {label}`.
	 */
	label: string;
	/**
	 * Icon shown while the row is collapsed (activating it expands the row).
	 * @default <PlusIcon weight="bold" />
	 */
	expandIcon?: ReactNode;
	/**
	 * Icon shown while the row is expanded (activating it collapses the row).
	 * @default <MinusIcon weight="bold" />
	 */
	collapseIcon?: ReactNode;
};

/**
 * An accessible +/- toggle that expands or collapses a row's detail panel. Drop
 * it inside a `DataTable.Cell` in a leading `columnHelper.display` column and
 * pair it with `DataTable.ExpandedRow`.
 *
 * Renders a real `<button>` (keyboard operable) that sets `aria-expanded` and,
 * while expanded, `aria-controls` pointing at the `DataTable.ExpandedRow`. It
 * stops click propagation so it never triggers a row-level `onClick` (e.g. row
 * navigation), and renders nothing when `row.getCanExpand()` is false so a
 * `getRowCanExpand` predicate cleanly hides it. Forwards `IconButton` props, so
 * pass `onClick` to run side effects before the toggle (call
 * `event.preventDefault()` to veto it).
 *
 * The table must register `rowExpandingFeature`; the `row` prop's type rejects a row
 * from a table without it. Add `expandedRowModel: createExpandedRowModel()` when rows
 * have sub-rows; a detail panel expands without it.
 *
 * @see https://mantle.ngrok.com/components/data-display/data-table#datatablerowexpandbutton
 *
 * @example
 * ```tsx
 * const features = tableFeatures({
 *   rowExpandingFeature,
 *   expandedRowModel: createExpandedRowModel(),
 * });
 * const columnHelper = createColumnHelper<typeof features, Row>();
 *
 * columnHelper.display({
 *   id: "expander",
 *   header: () => <DataTable.ExpandHeader />,
 *   cell: (props) => (
 *     <DataTable.Cell className="w-9 px-0 text-center">
 *       <DataTable.RowExpandButton row={props.row} label={props.row.original.name} />
 *     </DataTable.Cell>
 *   ),
 * });
 * ```
 */
function RowExpandButton<TFeatures extends ExpandableTableFeatures, TData extends RowData>({
	appearance = "ghost",
	className,
	collapseIcon = defaultCollapseIcon,
	expandIcon = defaultExpandIcon,
	intent = "neutral",
	label,
	onClick,
	row,
	size = "sm",
	...props
}: DataTableRowExpandButtonProps<TFeatures, TData>) {
	const renderToggle = () => {
		if (!row.getCanExpand()) {
			return null;
		}

		const isExpanded = row.getIsExpanded();
		const toggleExpanded = row.getToggleExpandedHandler();

		return (
			<IconButton
				type="button"
				data-slot="data-table-row-expand-button"
				appearance={appearance}
				intent={intent}
				size={size}
				className={cx("rounded", className)}
				aria-expanded={isExpanded}
				// Reference the detail row only while it actually exists in the DOM — a
				// dangling `aria-controls` IDREF is an accessibility validity violation.
				aria-controls={isExpanded ? expandedRowId(row) : undefined}
				icon={isExpanded ? collapseIcon : expandIcon}
				label={`${isExpanded ? "Hide" : "Show"} details for ${label}`}
				onClick={(event) => {
					// Always keep the toggle click from bubbling to a row-level onClick
					// (e.g. navigation) — even when a consumer vetoes the toggle below.
					event.stopPropagation();
					onClick?.(event);
					if (event.defaultPrevented) {
						return;
					}
					toggleExpanded();
				}}
				{...props}
			/>
		);
	};

	// The selector reads this row's expanded flag, so the toggle re-renders only
	// when its own row expands or collapses.
	return (
		<Subscribe source={row.table.store} selector={() => row.getIsExpanded()}>
			{renderToggle}
		</Subscribe>
	);
}

type DataTableExpandedRowProps<TFeatures extends TableFeatures, TData extends RowData> = Omit<
	ComponentProps<typeof Table.Row>,
	"children"
> & {
	/** The row whose detail panel this displays. */
	row: TableRow<TFeatures, TData>;
	/**
	 * Override the cell's `colSpan`. Defaults to the row's visible-cell count so
	 * the panel spans every visible column (visibility- and pinning-aware).
	 */
	colSpan?: number;
	/** The detail content rendered inside the full-width panel. */
	children: ReactNode;
};

/**
 * The sibling `<tr>` that renders a row's expanded detail panel. For the common
 * case, prefer `DataTable.Row`'s `renderExpanded` prop, which renders this for
 * you. Reach for `ExpandedRow` directly when you need full control — a custom
 * `colSpan`, multiple panels, or bespoke markup. Render it directly after the
 * parent `DataTable.Row` — wrapped in a `Fragment`, never a DOM element (a node
 * between `<tbody>` and `<tr>` is invalid HTML) — and only when
 * `row.getIsExpanded()` is true.
 *
 * The single cell spans every visible column (override with `colSpan`), carries
 * the `id` that `DataTable.RowExpandButton` targets via `aria-controls`, and
 * sits on an opaque card surface so horizontally-scrolled content never shows
 * through a sticky action column. Its top divider is suppressed so it reads as
 * one block with its parent row; the panel itself does not change on hover (only
 * the parent data row reacts to hover). Exposes `data-expanded-content` for
 * styling hooks.
 *
 * @see https://mantle.ngrok.com/components/data-display/data-table#datatableexpandedrow
 *
 * @example
 * Render the row's underlying object as JSON (a common detail-panel use case).
 * `jsonCodeBlockValue` highlights the JSON entirely on the client — no Shiki
 * runtime, no build-time plugin, no server roundtrip — so it works for runtime
 * data and matches server/build-time highlighting:
 * ```tsx
 * import { CodeBlock, jsonCodeBlockValue } from "@ngrok/mantle/code-block";
 * import { Fragment } from "react";
 *
 * {table.getRowModel().rows.map((row) => (
 *   <Fragment key={row.id}>
 *     <DataTable.Row row={row} />
 *     {row.getIsExpanded() && (
 *       <DataTable.ExpandedRow row={row}>
 *         <CodeBlock.Root>
 *           <CodeBlock.Body>
 *             <CodeBlock.CopyButton />
 *             <CodeBlock.Code value={jsonCodeBlockValue(row.original)} />
 *           </CodeBlock.Body>
 *         </CodeBlock.Root>
 *       </DataTable.ExpandedRow>
 *     )}
 *   </Fragment>
 * ))}
 * ```
 */
function ExpandedRow<TFeatures extends TableFeatures, TData extends RowData>({
	children,
	className,
	colSpan,
	row,
	...props
}: DataTableExpandedRowProps<TFeatures, TData>) {
	// Why callMemoOrStaticFn: `getVisibleCells` exists on the row only when the
	// table registers `columnVisibilityFeature`. The static function counts
	// every cell for a table that cannot hide columns.
	const countVisibleCells = () =>
		callMemoOrStaticFn(row, "getVisibleCells", row_getVisibleCells).length;

	const renderPanel = (numberOfColumns: number) => (
		<Table.Row
			data-slot="data-table-expanded-row"
			data-expanded-content
			// Read as one block with the parent row: suppress the top divider that
			// Table.Body paints between sibling rows.
			className={cx("[&>td]:border-t-0", className)}
			{...props}
		>
			<Table.Cell
				id={expandedRowId(row)}
				colSpan={numberOfColumns}
				// Opaque card surface (so scrolled content never shows through a sticky
				// column) with neutral body typography (Table.Cell defaults to mono).
				className="bg-card font-sans text-body"
			>
				{children}
			</Table.Cell>
		</Table.Row>
	);

	if (colSpan != null) {
		return renderPanel(colSpan);
	}

	// The selector counts the visible cells, so the panel re-renders only when a
	// column is hidden, shown, pinned, or reordered.
	return (
		<Subscribe source={row.table.store} selector={countVisibleCells}>
			{renderPanel}
		</Subscribe>
	);
}

/**
 * Use `DataTable` for INTERACTIVE tabular data — sorting, filtering, pagination,
 * row selection, and server-side or client-side data. Built on TanStack Table;
 * the consumer MUST construct a `useTable` instance from
 * `@tanstack/react-table` and pass it to `DataTable.Root` via the `table` prop.
 * Every TanStack export (`useTable`, `tableFeatures`, `createColumnHelper`, the
 * `*Feature` objects, the `create*RowModel` factories, the `sortFn_*` and `filterFn_*` comparators,
 * …) is re-exported from `@ngrok/mantle/data-table` so a single import covers
 * both the wrapper components and the TanStack helpers.
 *
 * For STATIC, layout-driven tables (read-only data dumps, simple key/value
 * displays, plain markup tables with no interactivity), use `Table` instead.
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
 *     │   ├── DataTable.Cell
 *     │   │   └── DataTable.RowExpandButton
 *     │   └── DataTable.ActionCell
 *     ├── DataTable.ExpandedRow
 *     └── DataTable.EmptyRow
 * ```
 *
 * @example
 * Minimal — read-only table with a single sortable column:
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
 * Sortable, filterable, paginated, with both empty states — a global text
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
 * import { CursorPagination } from "@ngrok/mantle/pagination";
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
 *             // No results for the active filter — give the user a way out.
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
 *             // No data yet — informational, optionally a primary "create" action.
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
 *         className="flex justify-end"
 *         pageSize={table.state.pagination.pageSize}
 *         onChangePageSize={(size) => {
 *           table.setPageSize(size);
 *           table.setPageIndex(0); // reset to the first page when the size changes
 *         }}
 *       >
 *         <CursorPagination.PageSizeSelect />
 *         <CursorPagination.Buttons
 *           hasPreviousPage={table.getCanPreviousPage()}
 *           hasNextPage={table.getCanNextPage()}
 *           onPreviousPage={() => table.previousPage()}
 *           onNextPage={() => table.nextPage()}
 *         />
 *       </CursorPagination.Root>
 *     </div>
 *   );
 * }
 * ```
 *
 * @example
 * Row action column — a sticky right-edge cell with a dropdown menu of actions.
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
const DataTable = {
	/**
	 * The root container of the data table component. REQUIRED: pass a
	 * `useTable` instance (from `@tanstack/react-table`, also re-exported
	 * from `@ngrok/mantle/data-table`) via the `table` prop — every other
	 * `DataTable.*` part reads from it through context.
	 *
	 * @see https://mantle.ngrok.com/components/data-display/data-table#datatableroot
	 *
	 * @example
	 * ```tsx
	 * const table = useTable({ features, data, columns });
	 * const rows = table.getRowModel().rows;
	 *
	 * <DataTable.Root table={table}>
	 *   <DataTable.Head />
	 *   <DataTable.Body>
	 *     {rows.length > 0
	 *       ? rows.map((row) => <DataTable.Row key={row.id} row={row} />)
	 *       : <DataTable.EmptyRow>No results.</DataTable.EmptyRow>}
	 *   </DataTable.Body>
	 * </DataTable.Root>
	 * ```
	 */
	Root,
	/**
	 * A sticky action cell positioned at the end of each row, typically holding
	 * an `IconButton` that opens a `DropdownMenu`. Pair with `DataTable.ActionHeader`.
	 *
	 * A click inside the cell never reaches a clickable row: the cell stops
	 * propagation and keeps the click's default action, so an action menu opens
	 * without the row navigating.
	 *
	 * @see https://mantle.ngrok.com/components/data-display/data-table#datatableactioncell
	 *
	 * @example
	 * ```tsx
	 * columnHelper.display({
	 *   id: "actions",
	 *   header: () => <DataTable.ActionHeader />,
	 *   cell: () => (
	 *     <DataTable.ActionCell>
	 *       <DropdownMenu.Root>...</DropdownMenu.Root>
	 *     </DataTable.ActionCell>
	 *   ),
	 * });
	 * ```
	 */
	ActionCell,
	/**
	 * A sticky header cell that pairs with `DataTable.ActionCell`. Use this as the
	 * header for the action column so the pinned column visually aligns across the
	 * header and every body row when the table scrolls horizontally. Renders a
	 * screen-reader-only "Actions" label by default, so the column has a name while
	 * it stays visually empty.
	 *
	 * @see https://mantle.ngrok.com/components/data-display/data-table#datatableactionheader
	 *
	 * @example
	 * ```tsx
	 * columnHelper.display({
	 *   id: "actions",
	 *   header: () => <DataTable.ActionHeader />,
	 *   cell: () => (
	 *     <DataTable.ActionCell>
	 *       <DropdownMenu.Root>...</DropdownMenu.Root>
	 *     </DataTable.ActionCell>
	 *   ),
	 * });
	 * ```
	 */
	ActionHeader,
	/**
	 * A `<td>` for rendering an individual data cell. Re-exported from
	 * `Table.Cell`. Every cell rendered by a column's `cell` function should
	 * be wrapped in this — a raw `<td>` skips mantle typography and padding.
	 *
	 * @see https://mantle.ngrok.com/components/data-display/data-table#datatablecell
	 *
	 * @example
	 * ```tsx
	 * columnHelper.accessor("name", {
	 *   id: "name",
	 *   header: (props) => <DataTable.Header>Name</DataTable.Header>,
	 *   cell: (props) => <DataTable.Cell>{props.getValue()}</DataTable.Cell>,
	 * });
	 * ```
	 */
	Cell: Table.Cell,
	/**
	 * The `<tbody>` container for rows of data. Typically wraps a map of
	 * `DataTable.Row`, with a `DataTable.EmptyRow` fallback when there is
	 * no data.
	 *
	 * @see https://mantle.ngrok.com/components/data-display/data-table#datatablebody
	 *
	 * @example
	 * ```tsx
	 * <DataTable.Body>
	 *   {rows.length > 0
	 *     ? rows.map((row) => <DataTable.Row key={row.id} row={row} />)
	 *     : <DataTable.EmptyRow>No results.</DataTable.EmptyRow>}
	 * </DataTable.Body>
	 * ```
	 */
	Body,
	/**
	 * An empty-state row that spans every column. Render this as the `else`
	 * branch when `rows.length === 0` to keep the table's frame intact instead
	 * of collapsing to an empty `<tbody>`.
	 *
	 * Drop an `Empty` in as the child for a real empty state — `EmptyRow` spans
	 * every column and `Empty.Root` centers itself, so no `<td>` or centering
	 * markup is needed.
	 *
	 * @see https://mantle.ngrok.com/components/data-display/data-table#datatableemptyrow
	 * @see https://mantle.ngrok.com/components/feedback/empty
	 *
	 * @example
	 * ```tsx
	 * import { DataTable } from "@ngrok/mantle/data-table";
	 * import { Empty } from "@ngrok/mantle/empty";
	 * import { TrayIcon } from "@phosphor-icons/react/Tray";
	 *
	 * <DataTable.EmptyRow>
	 *   <Empty.Root>
	 *     <Empty.Icon svg={<TrayIcon />} />
	 *     <Empty.Title>No endpoints yet</Empty.Title>
	 *   </Empty.Root>
	 * </DataTable.EmptyRow>
	 * ```
	 */
	EmptyRow,
	/**
	 * The `<thead>` container that renders column headers automatically from
	 * `table.getHeaderGroups()`. Does not accept children — headers come from
	 * each column's `header` definition.
	 *
	 * @see https://mantle.ngrok.com/components/data-display/data-table#datatablehead
	 *
	 * @example
	 * ```tsx
	 * <DataTable.Root table={table}>
	 *   <DataTable.Head />
	 *   <DataTable.Body>...</DataTable.Body>
	 * </DataTable.Root>
	 * ```
	 */
	Head,
	/**
	 * A `<th>` optimized for header actions. Wrap each column's header content in
	 * this; for sortable columns, nest a `DataTable.HeaderSortButton` inside and
	 * pass the same `column` here, so the cell carries `aria-sort` while the column
	 * is sorted. Non-sortable columns can render plain text.
	 *
	 * @see https://mantle.ngrok.com/components/data-display/data-table#datatableheader
	 *
	 * @example
	 * ```tsx
	 * columnHelper.accessor("name", {
	 *   id: "name",
	 *   header: (props) => (
	 *     <DataTable.Header column={props.column}>
	 *       <DataTable.HeaderSortButton column={props.column} sortingMode="alphanumeric">
	 *         Name
	 *       </DataTable.HeaderSortButton>
	 *     </DataTable.Header>
	 *   ),
	 *   cell: (props) => <DataTable.Cell>{props.getValue()}</DataTable.Cell>,
	 * });
	 * ```
	 */
	Header,
	/**
	 * A sortable button toggle for a column header in a data table. Renders a sort
	 * icon that reflects the current direction and cycles through sort states on
	 * click. The button's accessible name is the column label and does not change
	 * with the sort state; pass `column` to the surrounding `DataTable.Header` so
	 * the header cell exposes the state through `aria-sort`.
	 *
	 * Each click cycles through:
	 * - For `"alphanumeric"` sorting: `unsorted → ascending → descending → unsorted`
	 * - For `"time"` sorting: `unsorted → newest-first → oldest-first → unsorted`
	 *
	 * The table must register `rowSortingFeature`; the `column` prop's type rejects a
	 * column from a table without it. Pair it with `sortedRowModel: createSortedRowModel()`,
	 * or the button toggles the icon and never reorders a row. Register a `sortFns` slot
	 * too: without one, auto-sort falls back to `sortFn_basic`.
	 *
	 * When the column cannot sort (`disableSorting`, or `enableSorting: false` on
	 * the column), the part renders the label as plain text: no button, no icon.
	 *
	 * For right-aligned numeric columns, pass `className="justify-end"` and
	 * `iconPlacement="start"` so the sort icon stays paired with the label.
	 *
	 * | Data Attribute             | Value                              | Description                                                                                                                 |
	 * | -------------------------- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
	 * | `data-sort-direction`      | `"asc"`, `"desc"`, or `"unsorted"` | The column's current sort direction. Always `"unsorted"` on the plain-text span.                                            |
	 * | `data-table-header-action` | present on the button              | Presence-only. `DataTable.Header` drops its horizontal padding when a descendant carries it. Absent on the plain-text span. |
	 *
	 * @see https://mantle.ngrok.com/components/data-display/data-table#datatableheadersortbutton
	 *
	 * @example
	 * ```tsx
	 * const features = tableFeatures({
	 *   rowSortingFeature,
	 *   sortedRowModel: createSortedRowModel(),
	 *   sortFns: {
	 *     alphanumeric: sortFn_alphanumeric,
	 *     datetime: sortFn_datetime,
	 *     text: sortFn_text,
	 *   },
	 * });
	 * const columnHelper = createColumnHelper<typeof features, Row>();
	 *
	 * columnHelper.accessor("email", {
	 *   id: "email",
	 *   header: (props) => (
	 *     <DataTable.Header column={props.column}>
	 *       <DataTable.HeaderSortButton column={props.column} sortingMode="alphanumeric">
	 *         Email
	 *       </DataTable.HeaderSortButton>
	 *     </DataTable.Header>
	 *   ),
	 *   cell: (props) => <DataTable.Cell>{props.getValue()}</DataTable.Cell>,
	 * });
	 * ```
	 */
	HeaderSortButton,
	/**
	 * A single data table body row rendered from a TanStack Table row instance.
	 * Does not accept children — cells come from each column's `cell` definition.
	 *
	 * When `onClick` is set, the row receives `cursor-pointer` and `data-clickable`.
	 * It runs the handler only for a plain primary click: a modified click, a
	 * non-primary button, and a click that ends a text selection in the row skip
	 * it. Pass a different `cursor-*` class via `className` to override the
	 * cursor. A `<tr>` is not focusable, so also render a `<Link>` inside the
	 * primary cell as the keyboard and screen-reader path.
	 *
	 * Pass `renderExpanded` to give the row an inline detail panel — the row then
	 * renders a sibling `DataTable.ExpandedRow` (only while expanded) holding the
	 * returned content. Pair with `DataTable.RowExpandButton`.
	 *
	 * @see https://mantle.ngrok.com/components/data-display/data-table#datatablerow
	 *
	 * @example
	 * ```tsx
	 * import { CodeBlock, jsonCodeBlockValue } from "@ngrok/mantle/code-block";
	 *
	 * {rows.map((row) => (
	 *   <DataTable.Row
	 *     key={row.id}
	 *     row={row}
	 *     renderExpanded={(row) => (
	 *       <CodeBlock.Root>
	 *         <CodeBlock.Body>
	 *           <CodeBlock.CopyButton />
	 *           <CodeBlock.Code value={jsonCodeBlockValue(row.original)} />
	 *         </CodeBlock.Body>
	 *       </CodeBlock.Root>
	 *     )}
	 *   />
	 * ))}
	 * ```
	 */
	Row,
	/**
	 * A narrow `<th>` for the leading expand-toggle column, mirroring
	 * `DataTable.ActionHeader`. Renders a screen-reader-only label by default so
	 * the column is announced while staying visually empty.
	 *
	 * @see https://mantle.ngrok.com/components/data-display/data-table#datatableexpandheader
	 *
	 * @example
	 * ```tsx
	 * columnHelper.display({
	 *   id: "expander",
	 *   header: () => <DataTable.ExpandHeader />,
	 *   cell: (props) => (
	 *     <DataTable.Cell className="w-9 px-0 text-center">
	 *       <DataTable.RowExpandButton row={props.row} label={props.row.original.name} />
	 *     </DataTable.Cell>
	 *   ),
	 * });
	 * ```
	 */
	ExpandHeader,
	/**
	 * An accessible +/- toggle that expands or collapses a row's detail panel.
	 * Place it inside a `DataTable.Cell` in a leading `columnHelper.display`
	 * column and pair it with `DataTable.ExpandedRow`. Sets `aria-expanded` and
	 * (while expanded) `aria-controls`, stops click propagation so it never fires
	 * a row-level `onClick`, and renders nothing when `row.getCanExpand()` is
	 * false. The table must register `rowExpandingFeature`; the `row` prop's
	 * type rejects a row from a table without it.
	 *
	 * @see https://mantle.ngrok.com/components/data-display/data-table#datatablerowexpandbutton
	 *
	 * @example
	 * ```tsx
	 * <DataTable.Cell className="w-9 px-0 text-center">
	 *   <DataTable.RowExpandButton row={props.row} label={props.row.original.name} />
	 * </DataTable.Cell>
	 * ```
	 */
	RowExpandButton,
	/**
	 * The sibling `<tr>` that renders a row's expanded detail panel. Render it
	 * directly after the parent `DataTable.Row` (wrapped in a `Fragment`, never a
	 * DOM element) and only when `row.getIsExpanded()` is true. Spans every
	 * visible column, carries the `id` that `DataTable.RowExpandButton` targets,
	 * and sits on an opaque card surface so it coexists with a sticky action
	 * column.
	 *
	 * @see https://mantle.ngrok.com/components/data-display/data-table#datatableexpandedrow
	 *
	 * @example
	 * ```tsx
	 * import { CodeBlock, jsonCodeBlockValue } from "@ngrok/mantle/code-block";
	 * import { Fragment } from "react";
	 *
	 * {table.getRowModel().rows.map((row) => (
	 *   <Fragment key={row.id}>
	 *     <DataTable.Row row={row} />
	 *     {row.getIsExpanded() && (
	 *       <DataTable.ExpandedRow row={row}>
	 *         <CodeBlock.Root>
	 *           <CodeBlock.Body>
	 *             <CodeBlock.CopyButton />
	 *             <CodeBlock.Code value={jsonCodeBlockValue(row.original)} />
	 *           </CodeBlock.Body>
	 *         </CodeBlock.Root>
	 *       </DataTable.ExpandedRow>
	 *     )}
	 *   </Fragment>
	 * ))}
	 * ```
	 */
	ExpandedRow,
} as const;

export {
	//,
	DataTable,
	expandedRowId,
};

type DefaultSortIconProps = SvgAttributes & {
	direction: SortDirection | undefined;
	mode: SortingMode | undefined;
};

function DefaultSortIcon({ direction, mode, ...props }: DefaultSortIconProps) {
	if (direction === "unsorted" || !mode || !direction) {
		return <svg aria-hidden {...props} />;
	}

	return <SortIcon mode={mode} direction={direction} {...props} />;
}

/**
 * Toggle the sorting direction of a column.
 * This ordering is typically toggled by clicking the column header.
 *
 * @example
 * ```md
 * Each click cycles through...
 *
 * For alphanumeric sorting:
 *   unsorted ➡️ ascending ➡️ descending ➡️ unsorted ➡️ ...
 *
 * For time sorting:
 *   unsorted ➡️ newest-to-oldest ➡️ oldest-to-newest ➡️ unsorted ➡️ ...
 *
 *   this is equivalent to the inverse of alphanumeric sorting, or
 *   unsorted ➡️ descending ➡️ ascending ➡️ unsorted ➡️ ...
 * ```
 */
function toggleNextSortingDirection<
	TFeatures extends SortableTableFeatures,
	TData extends RowData,
	TValue extends CellData,
>(column: SortableColumn<TFeatures, TData, TValue>, sortingMode: SortingMode) {
	if (!column.getCanSort()) {
		return;
	}

	const sortDirection = column.getIsSorted();
	const currentSortDirection: SortDirection =
		typeof sortDirection === "string" ? sortDirection : "unsorted";

	const nextSortDirection = getNextSortDirection(currentSortDirection, sortingMode);

	switch (nextSortDirection) {
		case "unsorted":
			column.clearSorting();
			return;
		case "asc":
			column.toggleSorting(false);
			return;
		case "desc":
			column.toggleSorting(true);
			return;
		default:
			return;
	}
}
