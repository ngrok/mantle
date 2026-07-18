import { MinusIcon } from "@phosphor-icons/react/Minus";
import { PlusIcon } from "@phosphor-icons/react/Plus";
import {
	type Column,
	type HeaderContext,
	type Table as TableInstance,
	type Row as TableRow,
	flexRender,
} from "@tanstack/react-table";
import {
	type ComponentProps,
	Fragment,
	type ReactNode,
	createContext,
	useContext,
	useMemo,
} from "react";
import invariant from "tiny-invariant";
import { cx } from "../../utils/cx/cx.js";
import { $timeSortingDirection, type SortingMode } from "../../utils/sorting/direction.js";
import { Button, type ButtonAppearance } from "../button/button.js";
import { IconButton, type IconButtonAppearance } from "../button/icon-button.js";
import type { ButtonIntent } from "../button/intents.js";
import type { SvgAttributes } from "../icon/types.js";
import { SortIcon } from "../icons/sort.js";
import { Table } from "../table/table.js";
import { getNextSortDirection } from "./helpers.js";
import type { SortDirection } from "./types.js";

type DataTableContextShape<TData = unknown> = {
	table: TableInstance<TData>;
};

// oxlint-disable-next-line @typescript-eslint/no-explicit-any -- React context cannot preserve this generic across provider boundaries.
const DataTableContext = createContext<DataTableContextShape<any> | null>(null);

/**
 * @private
 */
function useDataTableContext<TData>() {
	const context = useContext(DataTableContext);

	invariant(context, "useDataTableContext should only be used within a DataTable child component");

	return context as DataTableContextShape<TData>;
}

type DataTableProps<TData> = ComponentProps<typeof Table.Root> & {
	table: TableInstance<TData>;
};

/**
 * The root container for a data table. Wraps all other `DataTable`
 * sub-components and provides the table context to its descendants.
 *
 * REQUIRED: Construct a TanStack Table instance via `useReactTable` (from
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
 *   getCoreRowModel,
 *   useReactTable,
 * } from "@ngrok/mantle/data-table";
 *
 * type Row = { id: string; name: string };
 * const columnHelper = createColumnHelper<Row>();
 * const columns = [
 *   columnHelper.accessor("name", {
 *     id: "name",
 *     header: () => <DataTable.Header>Name</DataTable.Header>,
 *     cell: (props) => <DataTable.Cell>{props.getValue()}</DataTable.Cell>,
 *   }),
 * ];
 *
 * function MyTable({ data }: { data: Row[] }) {
 *   const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() });
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
function Root<TData>({ children, table, ...props }: DataTableProps<TData>) {
	const context: DataTableContextShape<TData> = useMemo(() => ({ table }), [table]);

	return (
		<DataTableContext.Provider value={context}>
			<Table.Root data-slot="data-table" {...props}>
				<Table.Element>{children}</Table.Element>
			</Table.Root>
		</DataTableContext.Provider>
	);
}

type DataTableHeaderSortButtonProps<TData, TValue> = Omit<
	ComponentProps<typeof Button>,
	"appearance" | "icon" | "intent"
> &
	Pick<HeaderContext<TData, TValue>, "column"> & {
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
 * icon that reflects the current direction, handles ARIA announcements, and
 * cycles through sort states on click.
 *
 * Each click cycles through:
 * - For `"alphanumeric"` sorting: `unsorted → ascending → descending → unsorted`
 * - For `"time"` sorting: `unsorted → newest-first → oldest-first → unsorted`
 *
 * For right-aligned numeric columns, pass `className="justify-end"` and
 * `iconPlacement="start"` so the sort icon stays paired with the label.
 *
 * @see https://mantle.ngrok.com/components/data-display/data-table#datatableheadersortbutton
 *
 * @example
 * ```tsx
 * columnHelper.accessor("email", {
 *   id: "email",
 *   header: (props) => (
 *     <DataTable.Header>
 *       <DataTable.HeaderSortButton column={props.column} sortingMode="alphanumeric">
 *         Email
 *       </DataTable.HeaderSortButton>
 *     </DataTable.Header>
 *   ),
 *   cell: (props) => <DataTable.Cell>{props.getValue()}</DataTable.Cell>,
 * });
 * ```
 */
function HeaderSortButton<TData, TValue>({
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
}: DataTableHeaderSortButtonProps<TData, TValue>) {
	const rawSortDirection = column.getIsSorted();
	const canSort = !disableSorting && column.getCanSort();

	const sortDirection: SortDirection =
		canSort && typeof rawSortDirection === "string" ? rawSortDirection : "unsorted";

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
				if (!canSort || disableSorting || typeof sortingMode === "undefined") {
					return;
				}
				toggleNextSortingDirection(column, sortingMode);
			}}
			intent={intent}
			type="button"
			{...props}
		>
			{canSort && sortDirection !== "unsorted" && (
				<span className="sr-only">
					Column sorted in{" "}
					{sortingMode === "alphanumeric"
						? sortDirection === "asc"
							? "ascending"
							: "descending"
						: $timeSortingDirection(sortDirection)}{" "}
					order
				</span>
			)}
			{children}
		</Button>
	);
}

type DataTableHeaderProps = ComponentProps<typeof Table.Header>;

/**
 * A `<th>` optimized for header actions. Wrap each column's header content in
 * this; for sortable columns, nest a `DataTable.HeaderSortButton` inside.
 * Non-sortable columns can render plain text.
 *
 * @see https://mantle.ngrok.com/components/data-display/data-table#datatableheader
 *
 * @example
 * ```tsx
 * columnHelper.accessor("name", {
 *   id: "name",
 *   header: (props) => (
 *     <DataTable.Header>
 *       <DataTable.HeaderSortButton column={props.column} sortingMode="alphanumeric">
 *         Name
 *       </DataTable.HeaderSortButton>
 *     </DataTable.Header>
 *   ),
 *   cell: (props) => <DataTable.Cell>{props.getValue()}</DataTable.Cell>,
 * });
 * ```
 */
function Header({ children, className, ...props }: DataTableHeaderProps) {
	return (
		<Table.Header
			data-slot="data-table-header"
			className={cx("has-data-table-header-action:px-0", className)}
			{...props}
		>
			{children}
		</Table.Header>
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
 * const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() });
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
 * const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() });
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
function Head<TData>(props: DataTableHeadProps) {
	const { table } = useDataTableContext<TData>();

	return (
		<Table.Head data-slot="data-table-head" {...props}>
			{table.getHeaderGroups().map((headerGroup) => (
				<Table.Row key={headerGroup.id}>
					{headerGroup.headers.map((header) => (
						<Fragment key={header.id}>
							{header.isPlaceholder ? (
								<Table.Header key={header.id} />
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

type DataTableRowProps<TData> = Omit<ComponentProps<typeof Table.Row>, "children"> & {
	row: TableRow<TData>;
	/**
	 * Renders an inline detail panel beneath the row. Called only while the row is
	 * expanded (`row.getIsExpanded()`), so the panel — and any expensive work it
	 * does — stays lazy. Mantle wraps the returned content in a sibling
	 * `DataTable.ExpandedRow` spanning every visible column, so return just the
	 * panel content (not a `<tr>`). Requires the table to be configured for
	 * expansion (`getExpandedRowModel`, plus `getRowCanExpand` for detail panels);
	 * pair it with a `DataTable.RowExpandButton` toggle in a leading column. For
	 * full control over the detail row (custom `colSpan`, multiple panels), omit
	 * this and render `DataTable.ExpandedRow` yourself.
	 */
	renderExpanded?: (row: TableRow<TData>) => ReactNode;
};

/**
 * A single data table body row rendered from a TanStack Table row instance.
 * Does not accept children — cells come from each column's `cell` definition.
 *
 * When `onClick` is provided, the row automatically receives `cursor-pointer`.
 * Pass a different `cursor-*` class via `className` (e.g. `cursor-default`,
 * `cursor-wait`) to override. For keyboard and screen-reader access, also
 * render a `<Link>` inside the primary cell — a `<tr>` is not focusable.
 *
 * Pass `renderExpanded` to give the row an inline detail panel: when the row is
 * expanded the row renders its data `<tr>` plus a sibling `DataTable.ExpandedRow`
 * holding the returned content. Pair it with a `DataTable.RowExpandButton` toggle
 * and configure the table for expansion (`getExpandedRowModel`, `getRowCanExpand`).
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
function Row<TData>({ className, renderExpanded, row, ...props }: DataTableRowProps<TData>) {
	const dataRow = (
		<Table.Row
			data-slot="data-table-row"
			// Styling hook for the "this row is expanded" state (e.g. to pair the
			// parent row visually with its `DataTable.ExpandedRow`). Absent when the
			// row is collapsed or expansion is not configured.
			data-expanded={row.getIsExpanded() || undefined}
			className={cx(props.onClick && "cursor-pointer", className)}
			{...props}
		>
			{row.getVisibleCells().map((cell) => (
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
			{row.getIsExpanded() && <ExpandedRow row={row}>{renderExpanded(row)}</ExpandedRow>}
		</>
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
 * // `table` is your useReactTable instance; derive everything else from it.
 * const rows = table.getRowModel().rows;
 * const isFiltered = (table.getState().globalFilter ?? "") !== "";
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
function EmptyRow<TData>({ children, ...props }: DataTableEmptyRowProps) {
	const { table } = useDataTableContext<TData>();
	const numberOfColumns = table.getAllColumns().length;

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
 * If the row has `onClick`, pass `onClick={(event) => event.stopPropagation()}`
 * on this cell so clicks on action controls don't bubble and fire the row
 * handler.
 *
 * @see https://mantle.ngrok.com/components/data-display/data-table#datatableactioncell
 *
 * @example
 * ```tsx
 * columnHelper.display({
 *   id: "actions",
 *   header: () => <DataTable.ActionHeader />,
 *   cell: () => (
 *     <DataTable.ActionCell onClick={(event) => event.stopPropagation()}>
 *       <DropdownMenu.Root>...</DropdownMenu.Root>
 *     </DataTable.ActionCell>
 *   ),
 * });
 * ```
 */
function ActionCell({ children, className, ...props }: DataTableActionCellProps) {
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
 * header and every body row when the table scrolls horizontally.
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
			{hasRows && <StickyColIndicator />}
			{children}
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
function expandedRowId<TData>(row: TableRow<TData>): string {
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

type DataTableRowExpandButtonProps<TData> = Omit<
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
	 * is neutral-toned, so the wrapper defaults it.
	 * @default "neutral"
	 */
	intent?: ButtonIntent;
	/**
	 * The TanStack Table row this button toggles. The table must be configured for
	 * expansion (`getExpandedRowModel`, plus `getRowCanExpand: () => true` for
	 * custom detail panels, which have no sub-rows).
	 */
	row: TableRow<TData>;
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
 * @see https://mantle.ngrok.com/components/data-display/data-table#datatablerowexpandbutton
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
function RowExpandButton<TData>({
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
}: DataTableRowExpandButtonProps<TData>) {
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
}

type DataTableExpandedRowProps<TData> = Omit<ComponentProps<typeof Table.Row>, "children"> & {
	/** The row whose detail panel this displays. */
	row: TableRow<TData>;
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
function ExpandedRow<TData>({
	children,
	className,
	colSpan,
	row,
	...props
}: DataTableExpandedRowProps<TData>) {
	return (
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
				colSpan={colSpan ?? row.getVisibleCells().length}
				// Opaque card surface (so scrolled content never shows through a sticky
				// column) with neutral body typography (Table.Cell defaults to mono).
				className="bg-card font-sans text-body"
			>
				{children}
			</Table.Cell>
		</Table.Row>
	);
}

// Set display names to preserve original component names for debugging
Root.displayName = "DataTable";
ActionCell.displayName = "DataTableActionCell";
ActionHeader.displayName = "DataTableActionHeader";
Body.displayName = "DataTableBody";
EmptyRow.displayName = "DataTableEmptyRow";
ExpandHeader.displayName = "DataTableExpandHeader";
ExpandedRow.displayName = "DataTableExpandedRow";
Head.displayName = "DataTableHead";
Header.displayName = "DataTableHeader";
HeaderSortButton.displayName = "DataTableHeaderSortButton";
Row.displayName = "DataTableRow";
RowExpandButton.displayName = "DataTableRowExpandButton";

/**
 * Use `DataTable` for INTERACTIVE tabular data — sorting, filtering, pagination,
 * row selection, and server-side or client-side data. Built on TanStack Table;
 * the consumer MUST construct a `useReactTable` instance from
 * `@tanstack/react-table` and pass it to `DataTable.Root` via the `table` prop.
 * Every TanStack utility (`createColumnHelper`, `getCoreRowModel`,
 * `getSortedRowModel`, `getPaginationRowModel`, `getFilteredRowModel`,
 * `useReactTable`, …) is re-exported from `@ngrok/mantle/data-table` so a single
 * import covers both the wrapper components and the TanStack helpers.
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
 *   getCoreRowModel,
 *   useReactTable,
 * } from "@ngrok/mantle/data-table";
 *
 * type Row = { id: string; name: string };
 *
 * const columnHelper = createColumnHelper<Row>();
 * const columns = [
 *   columnHelper.accessor("name", {
 *     id: "name",
 *     header: (props) => (
 *       <DataTable.Header>
 *         <DataTable.HeaderSortButton column={props.column} sortingMode="alphanumeric">
 *           Name
 *         </DataTable.HeaderSortButton>
 *       </DataTable.Header>
 *     ),
 *     cell: (props) => <DataTable.Cell>{props.getValue()}</DataTable.Cell>,
 *   }),
 * ];
 *
 * function MyTable({ data }: { data: Row[] }) {
 *   const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() });
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
 *   createColumnHelper,
 *   getCoreRowModel,
 *   getFilteredRowModel,
 *   getPaginationRowModel,
 *   getSortedRowModel,
 *   useReactTable,
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
 * // `defaultPageSize` seeds an UNCONTROLLED <Select>, so keep it stable — a
 * // module const (or the table's INITIAL page size), never the live page size.
 * const DEFAULT_PAGE_SIZE = 10;
 *
 * const columnHelper = createColumnHelper<Payment>();
 * const columns = [
 *   columnHelper.accessor("status", {
 *     id: "status",
 *     header: (props) => (
 *       <DataTable.Header>
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
 *       <DataTable.Header>
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
 * ];
 *
 * function PaymentsTable({ data }: { data: Payment[] }) {
 *   const [globalFilter, setGlobalFilter] = useState("");
 *
 *   const table = useReactTable({
 *     data,
 *     columns,
 *     state: { globalFilter },
 *     onGlobalFilterChange: setGlobalFilter,
 *     getCoreRowModel: getCoreRowModel(),
 *     getSortedRowModel: getSortedRowModel(),
 *     getFilteredRowModel: getFilteredRowModel(),
 *     getPaginationRowModel: getPaginationRowModel(),
 *     initialState: { pagination: { pageSize: DEFAULT_PAGE_SIZE } },
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
 *       <CursorPagination.Root className="flex justify-end" defaultPageSize={DEFAULT_PAGE_SIZE}>
 *         <CursorPagination.PageSizeSelect
 *           onChangePageSize={(size) => {
 *             table.setPageSize(size);
 *             table.setPageIndex(0); // reset to the first page when the size changes
 *           }}
 *         />
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
 * If the row also has `onClick`, stop propagation on the action cell so clicks
 * don't bubble up and fire the row handler:
 * ```tsx
 * import { DataTable, createColumnHelper } from "@ngrok/mantle/data-table";
 * import { DropdownMenu } from "@ngrok/mantle/dropdown-menu";
 * import { IconButton } from "@ngrok/mantle/button";
 * import { DotsThreeVerticalIcon } from "@phosphor-icons/react/DotsThreeVertical";
 *
 * const columnHelper = createColumnHelper<Payment>();
 *
 * const columns = [
 *   // …other columns…
 *   columnHelper.display({
 *     id: "actions",
 *     header: () => <DataTable.ActionHeader />,
 *     cell: (props) => (
 *       <DataTable.ActionCell onClick={(event) => event.stopPropagation()}>
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
 * ];
 * ```
 *
 * @example
 * Clickable row navigating to a detail page — also render a `<Link>` inside the
 * primary cell so the row is reachable by keyboard and screen readers (a `<tr>`
 * is not focusable):
 * ```tsx
 * import { DataTable } from "@ngrok/mantle/data-table";
 * import { Link, href, useNavigate } from "react-router";
 *
 * function PaymentsTable({ data }: { data: Payment[] }) {
 *   const navigate = useNavigate();
 *   const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() });
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
 *       <Link to={href("/payments/:id", { id: props.row.original.id })}>
 *         {props.getValue()}
 *       </Link>
 *     </DataTable.Cell>
 *   ),
 * });
 * ```
 */
const DataTable = {
	/**
	 * The root container of the data table component. REQUIRED: pass a
	 * `useReactTable` instance (from `@tanstack/react-table`, also re-exported
	 * from `@ngrok/mantle/data-table`) via the `table` prop — every other
	 * `DataTable.*` part reads from it through context.
	 *
	 * @see https://mantle.ngrok.com/components/data-display/data-table#datatableroot
	 *
	 * @example
	 * ```tsx
	 * const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() });
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
	 * If the row has `onClick`, stop propagation on this cell so clicks on action
	 * controls don't bubble up and fire the row handler.
	 *
	 * @see https://mantle.ngrok.com/components/data-display/data-table#datatableactioncell
	 *
	 * @example
	 * ```tsx
	 * columnHelper.display({
	 *   id: "actions",
	 *   header: () => <DataTable.ActionHeader />,
	 *   cell: () => (
	 *     <DataTable.ActionCell onClick={(event) => event.stopPropagation()}>
	 *       <DropdownMenu.Root>...</DropdownMenu.Root>
	 *     </DataTable.ActionCell>
	 *   ),
	 * });
	 * ```
	 */
	ActionCell,
	/**
	 * A sticky header cell that pairs with `DataTable.ActionCell`, keeping the
	 * action column aligned across the header and body when scrolling horizontally.
	 * Use as the `header` for a `columnHelper.display` action column.
	 *
	 * @see https://mantle.ngrok.com/components/data-display/data-table#datatableactionheader
	 *
	 * @example
	 * ```tsx
	 * columnHelper.display({
	 *   id: "actions",
	 *   header: () => <DataTable.ActionHeader />,
	 *   cell: () => (
	 *     <DataTable.ActionCell onClick={(event) => event.stopPropagation()}>
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
	 * A `<th>` optimized for header actions. Wrap each column's header content
	 * in this; for sortable columns, nest a `DataTable.HeaderSortButton` inside.
	 *
	 * @see https://mantle.ngrok.com/components/data-display/data-table#datatableheader
	 *
	 * @example
	 * ```tsx
	 * columnHelper.accessor("name", {
	 *   id: "name",
	 *   header: (props) => (
	 *     <DataTable.Header>
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
	 * A sortable button toggle for a column header. Clicks cycle through
	 * sort directions: for `"alphanumeric"`, `unsorted → asc → desc → unsorted`;
	 * for `"time"`, `unsorted → desc (newest-first) → asc → unsorted`.
	 *
	 * Pass `className="justify-end"` and `iconPlacement="start"` for
	 * right-aligned numeric columns so the sort icon stays paired with the label.
	 *
	 * @see https://mantle.ngrok.com/components/data-display/data-table#datatableheadersortbutton
	 *
	 * @example
	 * ```tsx
	 * columnHelper.accessor("email", {
	 *   id: "email",
	 *   header: (props) => (
	 *     <DataTable.Header>
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
	 * When `onClick` is provided, the row automatically receives `cursor-pointer`.
	 * Pass a different `cursor-*` class via `className` to override. For keyboard
	 * and screen-reader access, also render a `<Link>` inside the primary cell.
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
	 * false.
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
function toggleNextSortingDirection<TData, TValue>(
	column: Column<TData, TValue>,
	sortingMode: SortingMode,
) {
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
