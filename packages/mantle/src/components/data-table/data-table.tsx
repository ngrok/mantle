import {
	type Column,
	type HeaderContext,
	type Table as TableInstance,
	type Row as TableRow,
	flexRender,
} from "@tanstack/react-table";
import {
	type ComponentProps,
	type ComponentPropsWithoutRef,
	type ComponentRef,
	Fragment,
	type ReactNode,
	createContext,
	forwardRef,
	useContext,
	useMemo,
} from "react";
import invariant from "tiny-invariant";
import { cx } from "../../utils/cx/cx.js";
import { $timeSortingDirection, type SortingMode } from "../../utils/sorting/direction.js";
import { Button } from "../button/button.js";
import type { SvgAttributes } from "../icon/types.js";
import { SortIcon } from "../icons/sort.js";
import { Table } from "../table/table.js";
import { getNextSortDirection } from "./helpers.js";
import type { SortDirection } from "./types.js";

type DataTableContextShape<TData = unknown> = {
	table: TableInstance<TData>;
};

// oxlint-disable-next-line typescript/no-explicit-any - known limitation of react context when using generics 😭
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
 * A data table component that provides sorting and other data table functionality.
 * Built on top of TanStack Table for advanced table features.
 *
 * @see https://mantle.ngrok.com/components/data-table#datatableroot
 *
 * @example
 * ```tsx
 * <DataTable table={table}>
 *   <DataTable.Head />
 *   <DataTable.Body>
 *     <DataTable.Rows />
 *   </DataTable.Body>
 * </DataTable>
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

type DataTableHeaderSortButtonProps<TData, TValue> = Omit<ComponentProps<typeof Button>, "icon"> &
	Pick<HeaderContext<TData, TValue>, "column"> &
	(
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
 * A sortable button toggle for a column header in a data table.
 * If the column is sortable, clicking the button will toggle the sorting
 * direction.
 *
 * @see https://mantle.ngrok.com/components/data-table#datatableheadersortbutton
 *
 * @example
 * ```tsx
 * <DataTable.HeaderSortButton
 *   column={column}
 *   sortingMode="alphanumeric"
 * >
 *   Column Title
 * </DataTable.HeaderSortButton>
 * ```
 *
 * Each click cycles through:
 * - For alphanumeric sorting: unsorted ➡️ ascending ➡️ descending ➡️ unsorted
 * - For time sorting: unsorted ➡️ newest-to-oldest ➡️ oldest-to-newest ➡️ unsorted
 */
function HeaderSortButton<TData, TValue>({
	children,
	className,
	column,
	disableSorting = false,
	iconPlacement = "end",
	sortingMode,
	sortIcon: propSortIcon,
	onClick,
	...props
}: DataTableHeaderSortButtonProps<TData, TValue>) {
	const _sortDirection = column.getIsSorted();
	const canSort = !disableSorting && column.getCanSort();

	const sortDirection: SortDirection =
		canSort && typeof _sortDirection === "string" ? _sortDirection : "unsorted";

	const sortIcon = propSortIcon?.(sortDirection) ?? (
		<DefaultSortIcon mode={sortingMode} direction={sortDirection} />
	);

	return (
		<Button
			appearance="ghost"
			data-slot="data-table-header-sort-button"
			className={cx(
				"flex justify-start w-full h-full rounded-none not-disabled:active:scale-none text-muted",
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
			priority="neutral"
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
 * A header for a data table.
 * This is typically used to wrap the `DataTable.HeaderSortButton` component.
 *
 * @see https://mantle.ngrok.com/components/data-table#datatableheader
 *
 * @example
 * ```tsx
 * <DataTable.Header>
 *   <DataTable.HeaderSortButton column={column} sortingMode="alphanumeric">
 *     Column Title
 *   </DataTable.HeaderSortButton>
 * </DataTable.Header>
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

const Body = forwardRef<
	ComponentRef<typeof Table.Body>,
	ComponentPropsWithoutRef<typeof Table.Body>
>((props, ref) => <Table.Body ref={ref} data-slot="data-table-body" {...props} />);
Body.displayName = "DataTableBody";

type DataTableHeadProps = Omit<ComponentProps<typeof Table.Head>, "children">;

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
};

function Row<TData>({ row, ...props }: DataTableRowProps<TData>) {
	return (
		<Table.Row data-slot="data-table-row" {...props}>
			{row.getVisibleCells().map((cell) => (
				<Fragment key={cell.id}>
					{flexRender(cell.column.columnDef.cell, cell.getContext())}
				</Fragment>
			))}
		</Table.Row>
	);
}

type DataTableEmptyRowProps = ComponentProps<typeof Table.Row>;

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
 * @see https://mantle.ngrok.com/components/data-table#datatableactionheader
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

// Set display names to preserve original component names for debugging
Root.displayName = "DataTable";
ActionCell.displayName = "DataTableActionCell";
ActionHeader.displayName = "DataTableActionHeader";
Body.displayName = "DataTableBody";
EmptyRow.displayName = "DataTableEmptyRow";
Head.displayName = "DataTableHead";
Header.displayName = "DataTableHeader";
HeaderSortButton.displayName = "DataTableHeaderSortButton";
Row.displayName = "DataTableRow";

/**
 * A data table component that provides sorting and other data table functionality.
 * Built on top of TanStack Table for advanced table features.
 *
 * @see https://mantle.ngrok.com/components/data-table
 *
 * @example
 * Composition:
 * ```
 * DataTable.Root
 * ├── DataTable.Head
 * │   └── DataTable.Row
 * │       ├── DataTable.Header
 * │       │   └── DataTable.HeaderSortButton
 * │       └── DataTable.ActionHeader
 * └── DataTable.Body
 *     ├── DataTable.Row
 *     │   ├── DataTable.Cell
 *     │   └── DataTable.ActionCell
 *     └── DataTable.EmptyRow
 * ```
 *
 * @example
 * ```tsx
 * <DataTable table={table}>
 *   <DataTable.Head />
 *   <DataTable.Body>
 *     <DataTable.Rows />
 *   </DataTable.Body>
 * </DataTable>
 * ```
 */
const DataTable = {
	/**
	 * The root container of the data table component.
	 *
	 * @see https://mantle.ngrok.com/components/data-table#datatableroot
	 *
	 * @example
	 * ```tsx
	 * <DataTable.Root table={table}>
	 *   <DataTable.Head />
	 *   <DataTable.Body>
	 *     <DataTable.Rows />
	 *   </DataTable.Body>
	 * </DataTable.Root>
	 * ```
	 */
	Root,
	/**
	 * A sticky action cell positioned at the end of each row for action buttons.
	 *
	 * @see https://mantle.ngrok.com/components/data-table#datatableactioncell
	 *
	 * @example
	 * ```tsx
	 * <DataTable.ActionCell>
	 *   <Button size="sm">Edit</Button>
	 *   <Button size="sm">Delete</Button>
	 * </DataTable.ActionCell>
	 * ```
	 */
	ActionCell,
	/**
	 * A sticky header cell that pairs with `DataTable.ActionCell`, keeping the
	 * action column aligned across the header and body when scrolling horizontally.
	 *
	 * @see https://mantle.ngrok.com/components/data-table#datatableactionheader
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
	ActionHeader,
	/**
	 * A table cell component for rendering individual data cells.
	 *
	 * @see https://mantle.ngrok.com/components/data-table#datatablecell
	 *
	 * @example
	 * ```tsx
	 * <DataTable.Cell>
	 *   Cell content
	 * </DataTable.Cell>
	 * ```
	 */
	Cell: Table.Cell,
	/**
	 * The table body container for rows of data.
	 *
	 * @see https://mantle.ngrok.com/components/data-table#datatablebody
	 *
	 * @example
	 * ```tsx
	 * <DataTable.Body>
	 *   <DataTable.Rows />
	 * </DataTable.Body>
	 * ```
	 */
	Body,
	/**
	 * An empty state row that spans all columns when there's no data to display.
	 *
	 * @see https://mantle.ngrok.com/components/data-table#datatableemptyrow
	 *
	 * @example
	 * ```tsx
	 * <DataTable.EmptyRow>
	 *   No data available
	 * </DataTable.EmptyRow>
	 * ```
	 */
	EmptyRow,
	/**
	 * The table header container that renders column headers automatically.
	 *
	 * @see https://mantle.ngrok.com/components/data-table#datatablehead
	 *
	 * @example
	 * ```tsx
	 * <DataTable.Head />
	 * ```
	 */
	Head,
	/**
	 * A header cell component optimized for data table header actions.
	 *
	 * @see https://mantle.ngrok.com/components/data-table#datatableheader
	 *
	 * @example
	 * ```tsx
	 * <DataTable.Header>
	 *   <DataTable.HeaderSortButton column={column} sortingMode="alphanumeric">
	 *     Column Title
	 *   </DataTable.HeaderSortButton>
	 * </DataTable.Header>
	 * ```
	 */
	Header,
	/**
	 * A sortable button toggle for column headers with sorting functionality.
	 *
	 * @see https://mantle.ngrok.com/components/data-table#datatableheadersortbutton
	 *
	 * @example
	 * ```tsx
	 * <DataTable.HeaderSortButton
	 *   column={column}
	 *   sortingMode="alphanumeric"
	 * >
	 *   Column Title
	 * </DataTable.HeaderSortButton>
	 * ```
	 */
	HeaderSortButton,
	/**
	 * A single data table row component for rendering custom row layouts.
	 *
	 * @see https://mantle.ngrok.com/components/data-table#datatablerow
	 *
	 * @example
	 * ```tsx
	 * <DataTable.Row row={row} />
	 * ```
	 */
	Row,
} as const;

export {
	//,
	DataTable,
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
