import { Button, IconButton } from "@ngrok/mantle/button";
import { Checkbox, selectAllChecked } from "@ngrok/mantle/checkbox";
import { CodeBlock, jsonCodeBlockValue } from "@ngrok/mantle/code-block";
import {
	DataTable,
	type ExpandedState,
	createColumnHelper,
	getCoreRowModel,
	getExpandedRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	type RowSelectionState,
	useReactTable,
} from "@ngrok/mantle/data-table";
import { DropdownMenu } from "@ngrok/mantle/dropdown-menu";
import { Empty } from "@ngrok/mantle/empty";
import { Icon } from "@ngrok/mantle/icon";
import { Input } from "@ngrok/mantle/input";
import { CursorPagination } from "@ngrok/mantle/pagination";
import { DotsThreeIcon } from "@phosphor-icons/react/DotsThree";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/MagnifyingGlass";
import { PencilSimpleIcon } from "@phosphor-icons/react/PencilSimple";
import { TrashIcon } from "@phosphor-icons/react/Trash";
import { TrayIcon } from "@phosphor-icons/react/Tray";
import { useMemo, useState } from "react";

type Payment = {
	id: string;
	amount: number;
	status: string;
	email: string;
};

const examplePayments: Payment[] = [
	{ id: "m5gr84i9", amount: 316, status: "success", email: "ken99@example.com" },
	{ id: "3u1reuv4", amount: 242, status: "success", email: "Abe45@example.com" },
	{ id: "derv1ws0", amount: 837, status: "processing", email: "Monserrat44@example.com" },
	{ id: "5kma53ae", amount: 874, status: "success", email: "Silas22@example.com" },
	{ id: "bhqecj4p", amount: 721, status: "failed", email: "carmella@example.com" },
];

const columnHelper = createColumnHelper<Payment>();

const columns = [
	columnHelper.accessor("id", {
		id: "id",
		header: (props) => (
			<DataTable.Header>
				<DataTable.HeaderSortButton column={props.column} sortingMode="alphanumeric">
					ID
				</DataTable.HeaderSortButton>
			</DataTable.Header>
		),
		cell: (props) => <DataTable.Cell key={props.cell.id}>{props.getValue()}</DataTable.Cell>,
	}),
	columnHelper.accessor("amount", {
		id: "amount",
		header: (props) => (
			<DataTable.Header className="w-50">
				<DataTable.HeaderSortButton
					className="justify-end"
					column={props.column}
					iconPlacement="start"
					sortingMode="alphanumeric"
				>
					Amount
				</DataTable.HeaderSortButton>
			</DataTable.Header>
		),
		cell: (props) => (
			<DataTable.Cell key={props.cell.id} className="text-right">
				{props.getValue()}
			</DataTable.Cell>
		),
	}),
	columnHelper.accessor("status", {
		id: "status",
		header: (props) => (
			<DataTable.Header>
				<DataTable.HeaderSortButton column={props.column} sortingMode="alphanumeric">
					Status
				</DataTable.HeaderSortButton>
			</DataTable.Header>
		),
		cell: (props) => <DataTable.Cell key={props.cell.id}>{props.getValue()}</DataTable.Cell>,
	}),
	columnHelper.accessor("email", {
		id: "email",
		header: (props) => (
			<DataTable.Header>
				<DataTable.HeaderSortButton column={props.column} sortingMode="alphanumeric">
					Email
				</DataTable.HeaderSortButton>
			</DataTable.Header>
		),
		cell: (props) => <DataTable.Cell key={props.cell.id}>{props.getValue()}</DataTable.Cell>,
	}),
	columnHelper.display({
		id: "actions",
		header: () => <DataTable.ActionHeader />,
		cell: () => (
			<DataTable.ActionCell onClick={(event) => event.stopPropagation()}>
				<DropdownMenu.Root>
					<DropdownMenu.Trigger asChild>
						<IconButton
							appearance="ghost"
							intent="neutral"
							className="rounded"
							type="button"
							size="sm"
							label="Open actions"
							icon={<DotsThreeIcon weight="bold" />}
						/>
					</DropdownMenu.Trigger>
					<DropdownMenu.Content align="end">
						<DropdownMenu.Item className="flex items-center gap-2">
							<Icon svg={<PencilSimpleIcon />} /> Edit
						</DropdownMenu.Item>
						<DropdownMenu.Item className="text-danger-600 flex items-center gap-2">
							<Icon svg={<TrashIcon />} />
							Delete
						</DropdownMenu.Item>
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			</DataTable.ActionCell>
		),
	}),
];

/**
 * Demo of a data table with sortable columns and row actions.
 */
export function PaymentsDemo() {
	const data = useMemo(() => examplePayments, []);
	const table = useReactTable({
		data,
		columns,
		getCoreRowModel: getCoreRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		initialState: {
			sorting: [{ id: "email", desc: false }],
			pagination: { pageSize: 100 },
		},
	});
	const rows = table.getRowModel().rows;
	return (
		<DataTable.Root table={table}>
			<DataTable.Head />
			<DataTable.Body>
				{rows.length > 0 ? (
					rows.map((row) => (
						<DataTable.Row
							key={row.id}
							onClick={() => {
								window.alert(`Clicked payment row: ${row.original.id}`);
							}}
							row={row}
						/>
					))
				) : (
					<DataTable.EmptyRow>
						<Empty.Root>
							<Empty.Icon svg={<TrayIcon />} />
							<Empty.Title>No payments yet</Empty.Title>
						</Empty.Root>
					</DataTable.EmptyRow>
				)}
			</DataTable.Body>
		</DataTable.Root>
	);
}

type Endpoint = {
	id: string;
	region: string;
	url: string;
	type: string;
	binding: string;
	created: string;
	updated: string;
};

const exampleEndpoints: Endpoint[] = [
	{
		id: "ep_abc123",
		region: "us-east-1",
		url: "https://2c3aq93ca44p6y1pper381em.ngrok.stage-ngrok.com",
		type: "Edge",
		binding: "1st app",
		created: "2025-03-01",
		updated: "2025-04-10",
	},
	{
		id: "ep_def456",
		region: "eu-west-1",
		url: "https://api-gateway.eu-west.example.internal",
		type: "Edge",
		binding: "1st app",
		created: "2025-02-15",
		updated: "2025-04-09",
	},
	{
		id: "ep_ghi789",
		region: "ap-southeast-1",
		url: "https://j2c3aqq93ca1p6y1lopper381em.ngrok.stage-ngrok.com",
		type: "Edge",
		binding: "",
		created: "2025-01-20",
		updated: "2025-04-08",
	},
	{
		id: "ep_jkl012",
		region: "us-west-2",
		url: "https://dashboard-frontend-us-west.example.internal",
		type: "Edge",
		binding: "1st app",
		created: "2025-03-10",
		updated: "2025-04-07",
	},
	{
		id: "ep_mno345",
		region: "us-east-1",
		url: "https://7jsteel.stage-ngrok.io",
		type: "Edge",
		binding: "",
		created: "2025-02-28",
		updated: "2025-04-06",
	},
	{
		id: "ep_pqr678",
		region: "eu-west-1",
		url: "https://j9be2-dash-controller-80.internal",
		type: "Edge",
		binding: "1st app",
		created: "2025-01-15",
		updated: "2025-04-05",
	},
	{
		id: "ep_stu901",
		region: "ap-southeast-1",
		url: "https://41b5af-a1-dashboard-frontend-controlplane-k1s1.internal",
		type: "Edge",
		binding: "",
		created: "2025-03-05",
		updated: "2025-04-04",
	},
	{
		id: "ep_vwx234",
		region: "us-west-2",
		url: "https://41b5af-a1-dashboard-frontend.internal",
		type: "Edge",
		binding: "1st app",
		created: "2025-02-01",
		updated: "2025-04-03",
	},
];

const endpointColumnHelper = createColumnHelper<Endpoint>();

const endpointColumns = [
	endpointColumnHelper.accessor("region", {
		id: "region",
		header: (props) => (
			<DataTable.Header className="min-w-28">
				<DataTable.HeaderSortButton column={props.column} sortingMode="alphanumeric">
					Region
				</DataTable.HeaderSortButton>
			</DataTable.Header>
		),
		cell: (props) => <DataTable.Cell key={props.cell.id}>{props.getValue()}</DataTable.Cell>,
	}),
	endpointColumnHelper.accessor("url", {
		id: "url",
		header: (props) => (
			<DataTable.Header className="min-w-100">
				<DataTable.HeaderSortButton column={props.column} sortingMode="alphanumeric">
					URL
				</DataTable.HeaderSortButton>
			</DataTable.Header>
		),
		cell: (props) => (
			<DataTable.Cell key={props.cell.id} className="truncate max-w-100">
				{props.getValue()}
			</DataTable.Cell>
		),
	}),
	endpointColumnHelper.accessor("type", {
		id: "type",
		header: (props) => (
			<DataTable.Header className="min-w-20">
				<DataTable.HeaderSortButton column={props.column} sortingMode="alphanumeric">
					Type
				</DataTable.HeaderSortButton>
			</DataTable.Header>
		),
		cell: (props) => <DataTable.Cell key={props.cell.id}>{props.getValue()}</DataTable.Cell>,
	}),
	endpointColumnHelper.accessor("binding", {
		id: "binding",
		header: (props) => (
			<DataTable.Header className="min-w-24">
				<DataTable.HeaderSortButton column={props.column} sortingMode="alphanumeric">
					Binding
				</DataTable.HeaderSortButton>
			</DataTable.Header>
		),
		cell: (props) => <DataTable.Cell key={props.cell.id}>{props.getValue()}</DataTable.Cell>,
	}),
	endpointColumnHelper.accessor("created", {
		id: "created",
		header: (props) => (
			<DataTable.Header className="min-w-28">
				<DataTable.HeaderSortButton column={props.column} sortingMode="alphanumeric">
					Created
				</DataTable.HeaderSortButton>
			</DataTable.Header>
		),
		cell: (props) => <DataTable.Cell key={props.cell.id}>{props.getValue()}</DataTable.Cell>,
	}),
	endpointColumnHelper.accessor("updated", {
		id: "updated",
		header: (props) => (
			<DataTable.Header className="min-w-28">
				<DataTable.HeaderSortButton column={props.column} sortingMode="alphanumeric">
					Updated
				</DataTable.HeaderSortButton>
			</DataTable.Header>
		),
		cell: (props) => <DataTable.Cell key={props.cell.id}>{props.getValue()}</DataTable.Cell>,
	}),
	endpointColumnHelper.display({
		id: "actions",
		header: () => <DataTable.ActionHeader />,
		cell: () => (
			<DataTable.ActionCell>
				<DropdownMenu.Root>
					<DropdownMenu.Trigger asChild>
						<IconButton
							appearance="ghost"
							intent="neutral"
							className="rounded"
							type="button"
							size="sm"
							label="Open actions"
							icon={<DotsThreeIcon weight="bold" />}
						/>
					</DropdownMenu.Trigger>
					<DropdownMenu.Content align="end">
						<DropdownMenu.Item className="flex items-center gap-2">
							<Icon svg={<PencilSimpleIcon />} /> Edit
						</DropdownMenu.Item>
						<DropdownMenu.Item className="text-danger-600 flex items-center gap-2">
							<Icon svg={<TrashIcon />} />
							Delete
						</DropdownMenu.Item>
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			</DataTable.ActionCell>
		),
	}),
];

/**
 * Demo of a wide data table with many columns to demonstrate horizontal overflow
 * and the sticky action column indicator.
 */
export function EndpointsDemo() {
	const data = useMemo(() => exampleEndpoints, []);
	const table = useReactTable({
		data,
		columns: endpointColumns,
		getCoreRowModel: getCoreRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		initialState: {
			sorting: [{ id: "region", desc: false }],
			pagination: { pageSize: 100 },
		},
	});
	const rows = table.getRowModel().rows;
	return (
		<DataTable.Root table={table}>
			<DataTable.Head />
			<DataTable.Body>
				{rows.length > 0 ? (
					rows.map((row) => <DataTable.Row key={row.id} row={row} />)
				) : (
					<DataTable.EmptyRow>
						<Empty.Root>
							<Empty.Icon svg={<TrayIcon />} />
							<Empty.Title>No endpoints yet</Empty.Title>
						</Empty.Root>
					</DataTable.EmptyRow>
				)}
			</DataTable.Body>
		</DataTable.Root>
	);
}

/**
 * Demo of a data table in its "no data yet" empty state — an informational
 * `Empty` with an optional primary "create" action, hosted in `DataTable.EmptyRow`.
 */
export function EmptyPaymentsDemo() {
	const data = useMemo<Payment[]>(() => [], []);
	const table = useReactTable({
		data,
		columns,
		getCoreRowModel: getCoreRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		initialState: {
			sorting: [{ id: "email", desc: false }],
			pagination: { pageSize: 100 },
		},
	});
	const rows = table.getRowModel().rows;
	return (
		<DataTable.Root table={table}>
			<DataTable.Head />
			<DataTable.Body>
				{rows.length > 0 ? (
					rows.map((row) => <DataTable.Row key={row.id} row={row} />)
				) : (
					<DataTable.EmptyRow>
						<Empty.Root>
							<Empty.Icon svg={<TrayIcon />} />
							<Empty.Title>No payments yet</Empty.Title>
							<Empty.Description>
								<p>Payments you receive will appear here.</p>
							</Empty.Description>
							<Empty.Actions>
								<Button type="button" appearance="filled" intent="neutral">
									Create payment
								</Button>
							</Empty.Actions>
						</Empty.Root>
					</DataTable.EmptyRow>
				)}
			</DataTable.Body>
		</DataTable.Root>
	);
}

/**
 * Demo of the "no results for the active filter" empty state. Typing a query
 * that matches nothing swaps in a filtered `Empty` whose `Clear filters` action
 * resets the search — distinct from the "no data yet" state above.
 */
export function FilteredEmptyStateDemo() {
	const data = useMemo(() => examplePayments, []);
	const [globalFilter, setGlobalFilter] = useState("");
	const table = useReactTable({
		data,
		columns,
		state: { globalFilter },
		onGlobalFilterChange: setGlobalFilter,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		initialState: { pagination: { pageSize: 100 } },
	});
	const rows = table.getRowModel().rows;
	const isFiltered = globalFilter.trim() !== "";
	return (
		<div className="flex w-full flex-col gap-4">
			<Input
				placeholder="Filter payments…"
				value={globalFilter}
				onChange={(event) => setGlobalFilter(event.target.value)}
			/>
			<DataTable.Root table={table}>
				<DataTable.Head />
				<DataTable.Body>
					{rows.length > 0 ? (
						rows.map((row) => <DataTable.Row key={row.id} row={row} />)
					) : isFiltered ? (
						<DataTable.EmptyRow>
							<Empty.Root>
								<Empty.Icon svg={<MagnifyingGlassIcon />} />
								<Empty.Title>No payments match your filter</Empty.Title>
								<Empty.Description>
									<p>Try a different search, or clear the filter to see everything.</p>
								</Empty.Description>
								<Empty.Actions>
									<Button
										type="button"
										appearance="outlined"
										intent="neutral"
										onClick={() => setGlobalFilter("")}
									>
										Clear filters
									</Button>
								</Empty.Actions>
							</Empty.Root>
						</DataTable.EmptyRow>
					) : (
						<DataTable.EmptyRow>
							<Empty.Root>
								<Empty.Icon svg={<TrayIcon />} />
								<Empty.Title>No payments yet</Empty.Title>
								<Empty.Description>
									<p>Payments you receive will appear here.</p>
								</Empty.Description>
							</Empty.Root>
						</DataTable.EmptyRow>
					)}
				</DataTable.Body>
			</DataTable.Root>
		</div>
	);
}

// `defaultPageSize` seeds an UNCONTROLLED <Select>, so keep it stable — a module
// const (or the table's INITIAL page size), never the live page size.
const DEFAULT_PAGE_SIZE = 10;

const paginatedStatuses = ["success", "processing", "failed", "pending"];

// A larger, deterministic dataset so the page-size dropdown and prev/next have
// something to page through.
const paginatedPayments: Payment[] = Array.from({ length: 23 }, (_, index) => ({
	id: `pmt_${(index + 1).toString().padStart(4, "0")}`,
	amount: 100 + index * 37,
	status: paginatedStatuses[index % paginatedStatuses.length] ?? "pending",
	email: `user${index + 1}@example.com`,
}));

/**
 * Demo of `CursorPagination` wired to a client-paginated TanStack table, with a
 * working page-size dropdown plus previous/next buttons driven by the table
 * instance (`getCanNextPage()` / `nextPage()` / `setPageSize()`).
 */
export function PaginatedPaymentsDemo() {
	const data = useMemo(() => paginatedPayments, []);
	const table = useReactTable({
		data,
		columns,
		getCoreRowModel: getCoreRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getSortedRowModel: getSortedRowModel(),
		initialState: { pagination: { pageSize: DEFAULT_PAGE_SIZE } },
	});
	const rows = table.getRowModel().rows;
	return (
		<div className="flex w-full flex-col gap-4">
			<DataTable.Root table={table}>
				<DataTable.Head />
				<DataTable.Body>
					{rows.length > 0 ? (
						rows.map((row) => <DataTable.Row key={row.id} row={row} />)
					) : (
						<DataTable.EmptyRow>
							<Empty.Root>
								<Empty.Icon svg={<TrayIcon />} />
								<Empty.Title>No payments yet</Empty.Title>
							</Empty.Root>
						</DataTable.EmptyRow>
					)}
				</DataTable.Body>
			</DataTable.Root>
			<CursorPagination.Root className="flex justify-end" defaultPageSize={DEFAULT_PAGE_SIZE}>
				<CursorPagination.PageSizeSelect
					onChangePageSize={(size) => {
						table.setPageSize(size);
						table.setPageIndex(0); // reset to the first page when the size changes
					}}
				/>
				<CursorPagination.Buttons
					hasPreviousPage={table.getCanPreviousPage()}
					hasNextPage={table.getCanNextPage()}
					onPreviousPage={() => table.previousPage()}
					onNextPage={() => table.nextPage()}
				/>
			</CursorPagination.Root>
		</div>
	);
}

const selectableColumns = [
	columnHelper.display({
		id: "select",
		// `<th>` defaults to more horizontal padding (`px-4`) than `<td>` (`p-3`);
		// match the cell's padding so the header checkbox lines up with the column
		// of row checkboxes.
		header: ({ table }) => (
			<DataTable.Header className="w-10 px-3">
				<Checkbox
					aria-label="Select all rows"
					checked={selectAllChecked({
						allSelected: table.getIsAllRowsSelected(),
						someSelected: table.getIsSomeRowsSelected(),
					})}
					onChange={(event) => table.toggleAllRowsSelected(event.target.checked)}
				/>
			</DataTable.Header>
		),
		cell: ({ row }) => (
			<DataTable.Cell className="w-10">
				<Checkbox
					aria-label="Select row"
					checked={row.getIsSelected()}
					onChange={(event) => row.toggleSelected(event.target.checked)}
				/>
			</DataTable.Cell>
		),
	}),
	...columns,
];

/**
 * Demo of row selection with checkboxes. The header checkbox toggles every row
 * (and goes indeterminate when only some are selected); the per-row checkboxes
 * drive `rowSelection` state read back from the table instance.
 */
export function SelectablePaymentsDemo() {
	const data = useMemo(() => examplePayments, []);
	const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
	const table = useReactTable({
		data,
		columns: selectableColumns,
		getCoreRowModel: getCoreRowModel(),
		state: { rowSelection },
		onRowSelectionChange: setRowSelection,
		enableRowSelection: true,
	});
	const selectedCount = table.getSelectedRowModel().rows.length;
	return (
		<div className="flex w-full flex-col gap-3">
			<p className="text-muted text-sm" aria-live="polite">
				{selectedCount} of {data.length} selected
			</p>
			<DataTable.Root table={table}>
				<DataTable.Head />
				<DataTable.Body>
					{table.getRowModel().rows.map((row) => (
						<DataTable.Row key={row.id} row={row} />
					))}
				</DataTable.Body>
			</DataTable.Root>
		</div>
	);
}

// A leading expand-toggle column in front of the existing payment columns (which
// already end with a sticky action column) — so the +/- toggle on the left and
// the pinned actions on the right coexist.
const expandableColumns = [
	columnHelper.display({
		id: "expander",
		header: () => <DataTable.ExpandHeader />,
		cell: (props) => (
			<DataTable.Cell className="w-9 px-0 text-center">
				<DataTable.RowExpandButton row={props.row} label={props.row.original.email} />
			</DataTable.Cell>
		),
	}),
	...columns,
];

/**
 * Demo of expandable rows. A `DataTable.RowExpandButton` in the leading column
 * toggles a `DataTable.ExpandedRow` that renders the row's underlying object as
 * JSON via `CodeBlock` — a common "inspect the raw record" support workflow.
 * Expansion is driven entirely by native TanStack state (multiple rows may be
 * open at once).
 */
export function ExpandableRowsDemo() {
	const data = useMemo(() => examplePayments, []);
	const [expanded, setExpanded] = useState<ExpandedState>({});
	const table = useReactTable({
		data,
		columns: expandableColumns,
		state: { expanded },
		onExpandedChange: setExpanded,
		getRowCanExpand: () => true,
		getCoreRowModel: getCoreRowModel(),
		getExpandedRowModel: getExpandedRowModel(),
		getRowId: (row) => row.id,
	});
	const rows = table.getRowModel().rows;
	return (
		<DataTable.Root table={table}>
			<DataTable.Head />
			<DataTable.Body>
				{rows.length > 0 ? (
					rows.map((row) => (
						<DataTable.Row
							key={row.id}
							row={row}
							// `renderExpanded` is called lazily — only while the row is open —
							// so collapsed rows never build (or tokenize) their panel.
							renderExpanded={(row) => (
								<CodeBlock.Root>
									<CodeBlock.Body>
										<CodeBlock.CopyButton />
										{/* Highlighted entirely on the client — no Shiki runtime, no
										    build-time plugin, no server roundtrip. */}
										<CodeBlock.Code value={jsonCodeBlockValue(row.original)} />
									</CodeBlock.Body>
								</CodeBlock.Root>
							)}
						/>
					))
				) : (
					<DataTable.EmptyRow>
						<Empty.Root>
							<Empty.Icon svg={<TrayIcon />} />
							<Empty.Title>No payments yet</Empty.Title>
						</Empty.Root>
					</DataTable.EmptyRow>
				)}
			</DataTable.Body>
		</DataTable.Root>
	);
}
