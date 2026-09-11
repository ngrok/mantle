import { fireEvent, render, screen, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import {
	type ComponentProps,
	createRef,
	Fragment,
	type MouseEvent,
	type Ref,
	useMemo,
	useState,
} from "react";
import invariant from "tiny-invariant";
import { describe, expect, test, vi } from "vitest";
import { translateTextNodes } from "../../test-utils/translate-text-nodes.js";
import type { ButtonAppearance, ButtonIntent, IconButtonAppearance } from "../button/index.js";
import {
	type Column,
	DataTable,
	type ExpandedState,
	type Row as TableRow,
	type RowSelectionState,
	columnGroupingFeature,
	columnVisibilityFeature,
	createColumnHelper,
	createExpandedRowModel,
	createGroupedRowModel,
	createSortedRowModel,
	rowExpandingFeature,
	rowSelectionFeature,
	rowSortingFeature,
	sortFn_alphanumeric,
	sortFn_datetime,
	sortFn_text,
	tableFeatures,
	useTable,
} from "./index.js";

type Row = { id: string; name: string };

// Why an empty feature set: a v9 instance carries a feature's methods only when
// the table registers that feature, so a table with none exercises every static
// fallback in `DataTable`.
const features = tableFeatures({});
const columnHelper = createColumnHelper<typeof features, Row>();
const columns = columnHelper.columns([
	columnHelper.accessor("name", {
		id: "name",
		header: () => <DataTable.Header>Name</DataTable.Header>,
		cell: (props) => <DataTable.Cell>{props.getValue()}</DataTable.Cell>,
	}),
]);
const data: Row[] = [{ id: "row-1", name: "Alice" }];

const sortableFeatures = tableFeatures({
	rowSortingFeature,
	sortedRowModel: createSortedRowModel(),
	sortFns: {
		alphanumeric: sortFn_alphanumeric,
		datetime: sortFn_datetime,
		text: sortFn_text,
	},
});
const sortableColumnHelper = createColumnHelper<typeof sortableFeatures, Row>();
// Why digits in the names: the alphanumeric comparator puts `web-2` before
// `web-10`, and the `sortFn_basic` fallback puts it after. A sorted order that
// matches the first proves the `sortFns` registry is wired.
const sortableData: Row[] = [
	{ id: "row-1", name: "web-10" },
	{ id: "row-2", name: "web-1" },
	{ id: "row-3", name: "web-2" },
];

const expandableFeatures = tableFeatures({
	rowExpandingFeature,
	expandedRowModel: createExpandedRowModel(),
});
const expandableColumnHelper = createColumnHelper<typeof expandableFeatures, Row>();

const visibilityFeatures = tableFeatures({ columnVisibilityFeature });
const visibilityColumnHelper = createColumnHelper<typeof visibilityFeatures, Row>();

// Why omit `renderExpanded`: its `row` parameter is typed against the generic
// constraint, and v9 rows are invariant in their features, so the spread cannot
// unify with the concrete row. This harness renders no detail panel.
function Harness(props: Omit<ComponentProps<typeof DataTable.Row>, "row" | "renderExpanded">) {
	const table = useTable({ features, data, columns });
	const row = table.getRowModel().rows[0];
	invariant(row, "Harness expected at least one row");
	return (
		<DataTable.Root table={table}>
			<DataTable.Body>
				<DataTable.Row data-testid="row" row={row} {...props} />
			</DataTable.Body>
		</DataTable.Root>
	);
}

/**
 * Three leaf columns on a table with no optional features: an accessor whose
 * header carries `column`, a plain accessor, and an action column. Each
 * `DataTable` part's static fallback renders against an instance that lacks the
 * feature method.
 */
const threeColumns = columnHelper.columns([
	columnHelper.accessor("id", {
		id: "id",
		header: (props) => <DataTable.Header column={props.column}>ID</DataTable.Header>,
		cell: (props) => <DataTable.Cell>{props.getValue()}</DataTable.Cell>,
	}),
	columnHelper.accessor("name", {
		id: "name",
		header: () => <DataTable.Header>Name</DataTable.Header>,
		cell: (props) => <DataTable.Cell>{props.getValue()}</DataTable.Cell>,
	}),
	columnHelper.display({
		id: "actions",
		header: () => <DataTable.ActionHeader />,
		cell: () => <DataTable.ActionCell>Edit</DataTable.ActionCell>,
	}),
]);

type PlainHarnessProps = {
	rows: Row[];
	/** Render a `DataTable.ExpandedRow` under every row, so its default `colSpan` is readable. */
	withDetail?: boolean;
};

function PlainHarness({ rows, withDetail = false }: PlainHarnessProps) {
	const table = useTable({
		features,
		data: rows,
		columns: threeColumns,
		getRowId: (row) => row.id,
	});
	const bodyRows = table.getRowModel().rows;
	return (
		<DataTable.Root table={table}>
			<DataTable.Head />
			<DataTable.Body>
				{bodyRows.length > 0 ? (
					bodyRows.map((row) => (
						<Fragment key={row.id}>
							<DataTable.Row data-testid={`row-${row.id}`} row={row} />
							{withDetail && (
								<DataTable.ExpandedRow data-testid={`detail-${row.id}`} row={row}>
									<span>Detail</span>
								</DataTable.ExpandedRow>
							)}
						</Fragment>
					))
				) : (
					<DataTable.EmptyRow>No results.</DataTable.EmptyRow>
				)}
			</DataTable.Body>
		</DataTable.Root>
	);
}

/** The same three columns on a table that registers `columnVisibilityFeature`. */
const visibilityColumns = visibilityColumnHelper.columns([
	visibilityColumnHelper.accessor("id", {
		id: "id",
		header: () => <DataTable.Header>ID</DataTable.Header>,
		cell: (props) => <DataTable.Cell>{props.getValue()}</DataTable.Cell>,
	}),
	visibilityColumnHelper.accessor("name", {
		id: "name",
		header: () => <DataTable.Header>Name</DataTable.Header>,
		cell: (props) => <DataTable.Cell>{props.getValue()}</DataTable.Cell>,
	}),
	visibilityColumnHelper.display({
		id: "actions",
		header: () => <DataTable.ActionHeader />,
		cell: () => <DataTable.ActionCell>Edit</DataTable.ActionCell>,
	}),
]);

/** Hides the `name` column through `columnVisibility` state. */
function VisibilityHarness({ rows, withDetail = false }: PlainHarnessProps) {
	const table = useTable({
		features: visibilityFeatures,
		data: rows,
		columns: visibilityColumns,
		state: { columnVisibility: { name: false } },
		getRowId: (row) => row.id,
	});
	const bodyRows = table.getRowModel().rows;
	return (
		<DataTable.Root table={table}>
			<DataTable.Head />
			<DataTable.Body>
				{bodyRows.length > 0 ? (
					bodyRows.map((row) => (
						<Fragment key={row.id}>
							<DataTable.Row data-testid={`row-${row.id}`} row={row} />
							{withDetail && (
								<DataTable.ExpandedRow data-testid={`detail-${row.id}`} row={row}>
									<span>Detail</span>
								</DataTable.ExpandedRow>
							)}
						</Fragment>
					))
				) : (
					<DataTable.EmptyRow>No results.</DataTable.EmptyRow>
				)}
			</DataTable.Body>
		</DataTable.Root>
	);
}

describe("DataTable.Row", () => {
	test("applies `cursor-pointer` when `onClick` is provided", () => {
		render(<Harness onClick={() => {}} />);
		expect(screen.getByTestId("row")).toHaveClass("cursor-pointer");
	});

	test("does not apply `cursor-pointer` when no `onClick` is provided", () => {
		render(<Harness />);
		expect(screen.getByTestId("row")).not.toHaveClass("cursor-pointer");
	});

	test("invokes `onClick` when the row is clicked", async () => {
		const user = userEvent.setup();
		const handleClick = vi.fn<() => void>();
		render(<Harness onClick={handleClick} />);

		await user.click(screen.getByTestId("row"));

		expect(handleClick).toHaveBeenCalledTimes(1);
	});

	test("consumer `className` takes precedence over the auto `cursor-pointer`", () => {
		render(<Harness onClick={() => {}} className="cursor-wait" />);
		const row = screen.getByTestId("row");
		expect(row).toHaveClass("cursor-wait");
		expect(row).not.toHaveClass("cursor-pointer");
	});

	test("stamps `data-clickable` only when `onClick` is set", () => {
		const { rerender } = render(<Harness onClick={() => {}} />);
		expect(screen.getByTestId("row")).toHaveAttribute("data-clickable", "");
		rerender(<Harness />);
		expect(screen.getByTestId("row")).not.toHaveAttribute("data-clickable");
	});

	test.each(["Meta", "Control", "Shift", "Alt"] as const)(
		"skips `onClick` for a %s-modified click, so the row's link can answer it",
		async (modifier) => {
			const user = userEvent.setup();
			const handleClick = vi.fn<() => void>();
			render(<Harness onClick={handleClick} />);

			await user.keyboard(`{${modifier}>}`);
			await user.click(screen.getByTestId("row"));
			await user.keyboard(`{/${modifier}}`);
			expect(handleClick).not.toHaveBeenCalled();

			await user.click(screen.getByTestId("row"));
			expect(handleClick).toHaveBeenCalledTimes(1);
		},
	);

	test("skips `onClick` for a non-primary button", () => {
		const handleClick = vi.fn<() => void>();
		render(<Harness onClick={handleClick} />);
		// A browser dispatches `auxclick`, not `click`, for a middle or right
		// button, and so does user-event, so only a synthesized event reaches
		// this guard.
		fireEvent.click(screen.getByTestId("row"), { button: 1 });
		expect(handleClick).not.toHaveBeenCalled();
	});

	test("renders every cell for a table without `columnVisibilityFeature`", () => {
		// A revert to `row.getVisibleCells()` throws a `TypeError` here: the
		// method exists on the row only when the table registers the feature.
		render(<PlainHarness rows={data} />);
		const cells = within(screen.getByTestId("row-row-1")).getAllByRole("cell");
		expect(cells.map((cell) => cell.textContent)).toEqual(["row-1", "Alice", "Edit"]);
	});

	test("omits a hidden column's cell when the table registers `columnVisibilityFeature`", () => {
		// A revert to `row.getAllCells()` renders the hidden `name` cell too.
		render(<VisibilityHarness rows={data} />);
		const cells = within(screen.getByTestId("row-row-1")).getAllByRole("cell");
		expect(cells.map((cell) => cell.textContent)).toEqual(["row-1", "Edit"]);
	});

	test("carries no `data-expanded` for a table without `rowExpandingFeature`", () => {
		// A revert to `row.getIsExpanded()` throws a `TypeError` here: the method
		// exists on the row only when the table registers the feature.
		render(<Harness />);
		expect(screen.getByTestId("row")).not.toHaveAttribute("data-expanded");
	});

	test("stamps `data-expanded` only while the row is expanded", async () => {
		const user = userEvent.setup();
		render(<ExpandableHarness />);
		expect(screen.getByTestId("row-row-1")).not.toHaveAttribute("data-expanded");

		await user.click(screen.getByRole("button", { name: "Show details for Alice" }));
		expect(screen.getByTestId("row-row-1")).toHaveAttribute("data-expanded");

		await user.click(screen.getByRole("button", { name: "Hide details for Alice" }));
		expect(screen.getByTestId("row-row-1")).not.toHaveAttribute("data-expanded");
	});
});

describe("DataTable.Header", () => {
	test("renders without `aria-sort` for a column from a table without `rowSortingFeature`", () => {
		// A revert to `column.getIsSorted()` throws a `TypeError` here: the method
		// exists on the column only when the table registers the feature.
		render(<PlainHarness rows={data} />);
		expect(screen.getByRole("columnheader", { name: "ID" })).not.toHaveAttribute("aria-sort");
	});
});

type ActionCellHarnessProps = {
	onRowClick?: () => void;
	onCellClick?: (event: MouseEvent<HTMLTableCellElement>) => void;
	onButtonClick?: () => void;
};

/**
 * Renders a clickable row with an action column, so the cell's click sandbox
 * can be exercised against the row handler it must never reach.
 */
function ActionCellHarness({ onRowClick, onCellClick, onButtonClick }: ActionCellHarnessProps) {
	const actionColumns = useMemo(
		() =>
			columnHelper.columns([
				columnHelper.accessor("name", {
					id: "name",
					header: () => <DataTable.Header>Name</DataTable.Header>,
					cell: (props) => <DataTable.Cell>{props.getValue()}</DataTable.Cell>,
				}),
				columnHelper.display({
					id: "actions",
					header: () => <DataTable.ActionHeader />,
					cell: () => (
						<DataTable.ActionCell onClick={onCellClick}>
							<button type="button" onClick={onButtonClick}>
								Open actions
							</button>
						</DataTable.ActionCell>
					),
				}),
			]),
		[onCellClick, onButtonClick],
	);
	const table = useTable({ features, data, columns: actionColumns });
	return (
		<DataTable.Root table={table}>
			<DataTable.Head />
			<DataTable.Body>
				{table.getRowModel().rows.map((row) => (
					<DataTable.Row key={row.id} row={row} onClick={onRowClick} />
				))}
			</DataTable.Body>
		</DataTable.Root>
	);
}

describe("DataTable.ActionCell", () => {
	test("a click on an action control never reaches a clickable row", async () => {
		const user = userEvent.setup();
		const handleRowClick = vi.fn<() => void>();
		const handleButtonClick = vi.fn<() => void>();
		render(<ActionCellHarness onRowClick={handleRowClick} onButtonClick={handleButtonClick} />);

		await user.click(screen.getByRole("button", { name: "Open actions" }));

		expect(handleButtonClick).toHaveBeenCalledTimes(1);
		expect(handleRowClick).not.toHaveBeenCalled();
	});

	test("runs the consumer's cell `onClick` after stopping propagation, and keeps the default action", async () => {
		const user = userEvent.setup();
		let propagationStopped: boolean | undefined;
		let defaultPrevented: boolean | undefined;
		const handleCellClick = vi.fn<(event: MouseEvent<HTMLTableCellElement>) => void>((event) => {
			propagationStopped = event.isPropagationStopped();
			defaultPrevented = event.defaultPrevented;
		});
		render(<ActionCellHarness onRowClick={() => {}} onCellClick={handleCellClick} />);

		await user.click(screen.getByRole("button", { name: "Open actions" }));

		expect(handleCellClick).toHaveBeenCalledTimes(1);
		expect(propagationStopped).toBe(true);
		expect(defaultPrevented).toBe(false);
	});

	test("keeps the `<td>` in the table's accessibility tree", () => {
		render(<ActionCellHarness />);
		// `sandboxedOnClickProps` also returns `role="presentation"`; the cell must
		// take only the handler, or it drops out of the table.
		expect(screen.getByRole("cell", { name: "Open actions" })).not.toHaveAttribute("role");
	});
});

type SortableHarnessProps = {
	appearance?: ButtonAppearance;
	intent?: ButtonIntent;
	disableSorting?: boolean;
	/** The ref the `disableSorting` branch passes to `DataTable.HeaderSortButton`. */
	disabledHeaderRef?: Ref<HTMLButtonElement>;
	enableSorting?: boolean;
};

/**
 * Renders a table with a single sortable column so `DataTable.HeaderSortButton`'s
 * optional `appearance`/`intent` pass-through can be exercised.
 */
function SortableHarness({
	appearance,
	intent,
	disableSorting = false,
	disabledHeaderRef,
	enableSorting = true,
}: SortableHarnessProps) {
	const sortableColumns = useMemo(
		() =>
			sortableColumnHelper.columns([
				sortableColumnHelper.accessor("name", {
					id: "name",
					enableSorting,
					header: (props) => (
						<DataTable.Header column={props.column}>
							{disableSorting ? (
								<DataTable.HeaderSortButton
									column={props.column}
									disableSorting
									id="name-label"
									title="Customer name"
									ref={disabledHeaderRef}
								>
									Name
								</DataTable.HeaderSortButton>
							) : (
								<DataTable.HeaderSortButton
									column={props.column}
									sortingMode="alphanumeric"
									appearance={appearance}
									intent={intent}
								>
									Name
								</DataTable.HeaderSortButton>
							)}
						</DataTable.Header>
					),
					cell: (props) => <DataTable.Cell>{props.getValue()}</DataTable.Cell>,
				}),
			]),
		[appearance, disableSorting, disabledHeaderRef, enableSorting, intent],
	);
	const table = useTable({
		features: sortableFeatures,
		data: sortableData,
		columns: sortableColumns,
	});
	return (
		<DataTable.Root table={table}>
			<DataTable.Head />
			<DataTable.Body>
				{table.getRowModel().rows.map((row) => (
					<DataTable.Row key={row.id} row={row} />
				))}
			</DataTable.Body>
		</DataTable.Root>
	);
}

describe("DataTable.HeaderSortButton", () => {
	test("defaults to a ghost + neutral button with the muted header text color", () => {
		render(<SortableHarness />);
		const button = screen.getByRole("button", { name: "Name" });
		expect(button).toHaveAttribute("data-appearance", "ghost");
		expect(button).toHaveAttribute("data-intent", "neutral");
		expect(button).toHaveClass("text-muted");
	});

	test("forwards explicit `appearance`/`intent` overrides to the underlying Button", () => {
		render(<SortableHarness appearance="outlined" intent="danger" />);
		const button = screen.getByRole("button", { name: "Name" });
		expect(button).toHaveAttribute("data-appearance", "outlined");
		expect(button).toHaveAttribute("data-intent", "danger");
	});

	test("does not apply `text-muted` when `intent` is overridden, so the tone text color survives", () => {
		render(<SortableHarness intent="danger" />);
		const button = screen.getByRole("button", { name: "Name" });
		expect(button).not.toHaveClass("text-muted");
	});

	test("keeps the column label as its name and moves the sort state to aria-sort on the header cell", async () => {
		const user = userEvent.setup();
		render(<SortableHarness />);
		const header = screen.getByRole("columnheader", { name: "Name" });
		const button = screen.getByRole("button", { name: "Name" });
		expect(button).toHaveAttribute("data-sort-direction", "unsorted");
		expect(header).not.toHaveAttribute("aria-sort");

		await user.click(button);
		expect(screen.getByRole("button", { name: "Name" })).toHaveAttribute(
			"data-sort-direction",
			"asc",
		);
		expect(header).toHaveAttribute("aria-sort", "ascending");
		expect(button).toHaveAccessibleName("Name");

		await user.click(button);
		expect(button).toHaveAttribute("data-sort-direction", "desc");
		expect(header).toHaveAttribute("aria-sort", "descending");
		expect(button).toHaveAccessibleName("Name");

		await user.click(button);
		expect(button).toHaveAttribute("data-sort-direction", "unsorted");
		expect(header).not.toHaveAttribute("aria-sort");
	});

	test("reorders the rows through unsorted → ascending → descending → unsorted", async () => {
		const user = userEvent.setup();
		render(<SortableHarness />);
		const button = screen.getByRole("button", { name: "Name" });
		// One accessor column, so the body cells read top to bottom as the rows do.
		const names = () => screen.getAllByRole("cell").map((cell) => cell.textContent);

		expect(names()).toEqual(["web-10", "web-1", "web-2"]);

		await user.click(button);
		// A dropped `sortedRowModel` leaves this order untouched. A dropped
		// `sortFns` falls back to `sortFn_basic`, which puts `web-10` before `web-2`.
		expect(names()).toEqual(["web-1", "web-2", "web-10"]);

		await user.click(button);
		expect(names()).toEqual(["web-10", "web-2", "web-1"]);

		await user.click(button);
		expect(names()).toEqual(["web-10", "web-1", "web-2"]);
	});

	test("disableSorting renders the label as plain text with no button and forwards the other props", () => {
		const ref = createRef<HTMLButtonElement>();
		render(<SortableHarness disableSorting disabledHeaderRef={ref} />);
		expect(screen.queryByRole("button")).not.toBeInTheDocument();
		const header = screen.getByRole("columnheader", { name: "Name" });
		expect(header).not.toHaveAttribute("aria-sort");
		const label = header.querySelector('[data-slot="data-table-header-sort-button"]');
		expect(label).toHaveAttribute("data-sort-direction", "unsorted");
		expect(label).toHaveAttribute("id", "name-label");
		expect(label).toHaveAttribute("title", "Customer name");
		expect(ref.current).toBe(label);
	});

	test("a column with enableSorting: false renders the label as plain text with no button", () => {
		render(<SortableHarness enableSorting={false} />);
		expect(screen.queryByRole("button")).not.toBeInTheDocument();
		expect(screen.getByRole("columnheader", { name: "Name" })).toBeInTheDocument();
	});

	test("keeps rendering when the first click sorts a browser-translated header", async () => {
		const user = userEvent.setup();
		render(<SortableHarness />);
		const button = screen.getByRole("button", { name: "Name" });
		translateTextNodes(button);

		await user.click(button);

		const sorted = screen.getByRole("button");
		expect(sorted).toHaveAttribute("data-sort-direction", "asc");
		expect(sorted).toHaveTextContent("[Name-es]");
	});
});

/**
 * Renders a table whose action column header carries text, so `ActionHeader`'s
 * empty-to-populated transition can be exercised against a translated header.
 */
function ActionHeaderHarness({ rows }: { rows: Row[] }) {
	const actionColumns = useMemo(
		() =>
			columnHelper.columns([
				columnHelper.accessor("name", {
					id: "name",
					header: () => <DataTable.Header>Name</DataTable.Header>,
					cell: (props) => <DataTable.Cell>{props.getValue()}</DataTable.Cell>,
				}),
				columnHelper.display({
					id: "actions",
					header: () => <DataTable.ActionHeader>Actions</DataTable.ActionHeader>,
					cell: () => <DataTable.ActionCell>Edit</DataTable.ActionCell>,
				}),
			]),
		[],
	);
	const table = useTable({ features, data: rows, columns: actionColumns });
	return (
		<DataTable.Root table={table}>
			<DataTable.Head />
			<DataTable.Body>
				{table.getRowModel().rows.map((row) => (
					<DataTable.Row key={row.id} row={row} />
				))}
			</DataTable.Body>
		</DataTable.Root>
	);
}

describe("DataTable.ActionHeader", () => {
	test('names the column "Actions" by default', () => {
		const actionOnlyColumns = columnHelper.columns([
			columnHelper.display({
				id: "actions",
				header: () => <DataTable.ActionHeader />,
				cell: () => <DataTable.ActionCell>Edit</DataTable.ActionCell>,
			}),
		]);
		function DefaultLabelHarness() {
			const table = useTable({ features, data, columns: actionOnlyColumns });
			return (
				<DataTable.Root table={table}>
					<DataTable.Head />
				</DataTable.Root>
			);
		}
		render(<DefaultLabelHarness />);
		expect(screen.getByRole("columnheader", { name: "Actions" })).toBeInTheDocument();
	});

	test("stamps the sticky-right attribute that Table.Root's scroll container selects on", () => {
		// Cross-file spelling pin: the `has-data-mantle-table-sticky-right:` selector in
		// Table.Root must match the attribute ActionHeader stamps, or the right-side
		// fade stays on under the pinned column with every test green.
		render(<ActionHeaderHarness rows={data} />);
		expect(screen.getByRole("columnheader", { name: "Actions" })).toHaveAttribute(
			"data-mantle-table-sticky-right",
		);
		const scroller = screen.getByRole("table").parentElement;
		expect(scroller?.className).toContain("has-data-mantle-table-sticky-right:");
	});

	test("keeps rendering when the first page of rows arrives on a browser-translated page", () => {
		const { rerender } = render(<ActionHeaderHarness rows={[]} />);
		const header = screen.getByRole("columnheader", { name: "Actions" });
		translateTextNodes(header);

		rerender(<ActionHeaderHarness rows={data} />);

		expect(screen.getByRole("columnheader", { name: "[Actions-es]" })).toBeInTheDocument();
		expect(screen.getByRole("cell", { name: "Alice" })).toBeInTheDocument();
	});
});

type ExpandableHarnessProps = {
	canExpand?: boolean;
	onRowClick?: () => void;
	buttonOnClick?: (event: MouseEvent<HTMLButtonElement>) => void;
	buttonAppearance?: IconButtonAppearance;
	detailColSpan?: number;
};

/**
 * Renders an expandable table wired with native TanStack expansion state so the
 * expand parts can be exercised with real toggle behavior.
 */
function ExpandableHarness({
	canExpand = true,
	onRowClick,
	buttonOnClick,
	buttonAppearance,
	detailColSpan,
}: ExpandableHarnessProps) {
	const [expanded, setExpanded] = useState<ExpandedState>({});
	const expandableColumns = useMemo(
		() =>
			expandableColumnHelper.columns([
				expandableColumnHelper.display({
					id: "expander",
					header: () => <DataTable.ExpandHeader />,
					cell: (props) => (
						<DataTable.Cell>
							<DataTable.RowExpandButton
								row={props.row}
								label={props.row.original.name}
								onClick={buttonOnClick}
								appearance={buttonAppearance}
							/>
						</DataTable.Cell>
					),
				}),
				expandableColumnHelper.accessor("name", {
					id: "name",
					header: () => <DataTable.Header>Name</DataTable.Header>,
					cell: (props) => <DataTable.Cell>{props.getValue()}</DataTable.Cell>,
				}),
			]),
		[buttonOnClick, buttonAppearance],
	);
	const table = useTable({
		features: expandableFeatures,
		data,
		columns: expandableColumns,
		state: { expanded },
		onExpandedChange: setExpanded,
		getRowCanExpand: () => canExpand,
		getRowId: (row) => row.id,
	});
	return (
		<DataTable.Root table={table}>
			<DataTable.Head />
			<DataTable.Body>
				{table.getRowModel().rows.map((row) => (
					<Fragment key={row.id}>
						<DataTable.Row data-testid={`row-${row.id}`} row={row} onClick={onRowClick} />
						{row.getIsExpanded() && (
							<DataTable.ExpandedRow
								data-testid={`detail-${row.id}`}
								row={row}
								colSpan={detailColSpan}
							>
								<span>Detail for {row.original.name}</span>
							</DataTable.ExpandedRow>
						)}
					</Fragment>
				))}
			</DataTable.Body>
		</DataTable.Root>
	);
}

describe("DataTable.RowExpandButton", () => {
	test("defaults to a ghost + neutral icon button", () => {
		render(<ExpandableHarness />);
		const button = screen.getByRole("button", { name: "Show details for Alice" });
		expect(button).toHaveAttribute("data-appearance", "ghost");
		expect(button).toHaveAttribute("data-intent", "neutral");
	});

	// `intent` has no override case: `IconButton` draws the neutral tone only,
	// so a forwarded `intent` cannot differ from the wrapper's own default.
	test("forwards an explicit `appearance` override to the underlying IconButton", () => {
		render(<ExpandableHarness buttonAppearance="outlined" />);
		const button = screen.getByRole("button", { name: "Show details for Alice" });
		expect(button).toHaveAttribute("data-appearance", "outlined");
	});

	test("renders a collapsed toggle labelled `Show details for …` with no aria-controls", () => {
		render(<ExpandableHarness />);
		const button = screen.getByRole("button", { name: "Show details for Alice" });
		expect(button).toHaveAttribute("aria-expanded", "false");
		// No dangling IDREF while the detail row is absent.
		expect(button).not.toHaveAttribute("aria-controls");
	});

	test("expands the row, relabels to `Hide details for …`, and links aria-controls to the detail row", async () => {
		const user = userEvent.setup();
		render(<ExpandableHarness />);

		await user.click(screen.getByRole("button", { name: "Show details for Alice" }));

		const button = screen.getByRole("button", { name: "Hide details for Alice" });
		expect(button).toHaveAttribute("aria-expanded", "true");

		const detailCell = within(screen.getByTestId("detail-row-1"))
			.getByText("Detail for Alice")
			.closest("td");
		expect(detailCell).toHaveAttribute("id", "data-table-expanded-row-row-1");
		expect(button).toHaveAttribute("aria-controls", "data-table-expanded-row-row-1");
	});

	test("collapses the row again on a second click", async () => {
		const user = userEvent.setup();
		render(<ExpandableHarness />);

		await user.click(screen.getByRole("button", { name: "Show details for Alice" }));
		expect(screen.getByTestId("detail-row-1")).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: "Hide details for Alice" }));
		expect(screen.queryByTestId("detail-row-1")).not.toBeInTheDocument();
	});

	test("stops propagation so it does not trigger a row-level onClick", async () => {
		const user = userEvent.setup();
		const handleRowClick = vi.fn<() => void>();
		render(<ExpandableHarness onRowClick={handleRowClick} />);

		await user.click(screen.getByRole("button", { name: "Show details for Alice" }));

		expect(handleRowClick).not.toHaveBeenCalled();
		expect(screen.getByTestId("detail-row-1")).toBeInTheDocument();
	});

	test("lets a consumer onClick veto the toggle via preventDefault — and still stops propagation", async () => {
		const user = userEvent.setup();
		const handleRowClick = vi.fn<() => void>();
		render(
			<ExpandableHarness
				onRowClick={handleRowClick}
				buttonOnClick={(event) => event.preventDefault()}
			/>,
		);

		await user.click(screen.getByRole("button", { name: "Show details for Alice" }));

		// Vetoed: the row does not expand…
		expect(screen.queryByTestId("detail-row-1")).not.toBeInTheDocument();
		// …and the click still never bubbles to the row-level onClick.
		expect(handleRowClick).not.toHaveBeenCalled();
	});

	test("renders nothing when the row cannot expand", () => {
		render(<ExpandableHarness canExpand={false} />);
		expect(screen.queryByRole("button")).not.toBeInTheDocument();
	});
});

describe("DataTable.ExpandedRow", () => {
	test("spans every visible column and carries the aria-controls target id", async () => {
		const user = userEvent.setup();
		render(<ExpandableHarness />);

		await user.click(screen.getByRole("button", { name: "Show details for Alice" }));

		const detailCell = within(screen.getByTestId("detail-row-1"))
			.getByText("Detail for Alice")
			.closest("td");
		// Two visible columns: the expander column + the name column.
		expect(detailCell).toHaveAttribute("colspan", "2");
		expect(detailCell).toHaveAttribute("id", "data-table-expanded-row-row-1");
	});

	test("honors a `colSpan` override", async () => {
		const user = userEvent.setup();
		render(<ExpandableHarness detailColSpan={1} />);

		await user.click(screen.getByRole("button", { name: "Show details for Alice" }));

		const detailCell = within(screen.getByTestId("detail-row-1"))
			.getByText("Detail for Alice")
			.closest("td");
		expect(detailCell).toHaveAttribute("colspan", "1");
	});

	test("defaults `colSpan` to the row's cell count for a table without `columnVisibilityFeature`", () => {
		// A revert to `row.getVisibleCells().length` throws a `TypeError` here: the
		// method exists on the row only when the table registers the feature.
		render(<PlainHarness rows={data} withDetail />);
		const detailCell = within(screen.getByTestId("detail-row-1")).getByText("Detail").closest("td");
		expect(detailCell).toHaveAttribute("colspan", "3");
	});

	test("defaults `colSpan` to the visible cells only when the table registers `columnVisibilityFeature`", () => {
		// A swap to `row.getAllCells().length` counts the hidden `name` cell too.
		render(<VisibilityHarness rows={data} withDetail />);
		const detailCell = within(screen.getByTestId("detail-row-1")).getByText("Detail").closest("td");
		expect(detailCell).toHaveAttribute("colspan", "2");
	});
});

describe("DataTable.ExpandHeader", () => {
	test("renders a screen-reader-only label by default", () => {
		render(<ExpandableHarness />);
		expect(screen.getByText("Row details")).toBeInTheDocument();
	});

	test("renders custom children when provided", () => {
		render(
			<table>
				<thead>
					<tr>
						<DataTable.ExpandHeader>Expand all</DataTable.ExpandHeader>
					</tr>
				</thead>
			</table>,
		);
		expect(screen.getByText("Expand all")).toBeInTheDocument();
	});
});

type RenderExpandedHarnessProps = {
	renderSpy?: (row: TableRow<typeof expandableFeatures, Row>) => void;
};

/**
 * Renders a table that drives its detail panel through `DataTable.Row`'s
 * `renderExpanded` prop (rather than a hand-written `ExpandedRow`). `renderSpy`
 * lets tests assert the lazy contract — that the panel is built only while open.
 */
function RenderExpandedHarness({ renderSpy }: RenderExpandedHarnessProps) {
	const [expanded, setExpanded] = useState<ExpandedState>({});
	const expandableColumns = useMemo(
		() =>
			expandableColumnHelper.columns([
				expandableColumnHelper.display({
					id: "expander",
					header: () => <DataTable.ExpandHeader />,
					cell: (props) => (
						<DataTable.Cell>
							<DataTable.RowExpandButton row={props.row} label={props.row.original.name} />
						</DataTable.Cell>
					),
				}),
				expandableColumnHelper.accessor("name", {
					id: "name",
					header: () => <DataTable.Header>Name</DataTable.Header>,
					cell: (props) => <DataTable.Cell>{props.getValue()}</DataTable.Cell>,
				}),
			]),
		[],
	);
	const table = useTable({
		features: expandableFeatures,
		data,
		columns: expandableColumns,
		state: { expanded },
		onExpandedChange: setExpanded,
		getRowCanExpand: () => true,
		getRowId: (row) => row.id,
	});
	return (
		<DataTable.Root table={table}>
			<DataTable.Head />
			<DataTable.Body>
				{table.getRowModel().rows.map((row) => (
					<DataTable.Row
						key={row.id}
						data-testid={`row-${row.id}`}
						row={row}
						renderExpanded={(row) => {
							renderSpy?.(row);
							return <span data-testid={`panel-${row.id}`}>Panel for {row.original.name}</span>;
						}}
					/>
				))}
			</DataTable.Body>
		</DataTable.Root>
	);
}

describe("DataTable.Row renderExpanded", () => {
	test("does not render or call the panel while the row is collapsed (lazy)", () => {
		const renderSpy = vi.fn<(row: TableRow<typeof expandableFeatures, Row>) => void>();
		render(<RenderExpandedHarness renderSpy={renderSpy} />);

		expect(screen.queryByTestId("panel-row-1")).not.toBeInTheDocument();
		expect(renderSpy).not.toHaveBeenCalled();
	});

	test("renders the panel in an ExpandedRow spanning every visible column once expanded", async () => {
		const user = userEvent.setup();
		const renderSpy = vi.fn<(row: TableRow<typeof expandableFeatures, Row>) => void>();
		render(<RenderExpandedHarness renderSpy={renderSpy} />);

		await user.click(screen.getByRole("button", { name: "Show details for Alice" }));

		expect(renderSpy).toHaveBeenCalled();
		expect(renderSpy).toHaveBeenLastCalledWith(expect.objectContaining({ id: "row-1" }));
		const panelCell = screen.getByTestId("panel-row-1").closest("td");
		expect(panelCell).toHaveAttribute("colspan", "2");
		expect(panelCell).toHaveAttribute("id", "data-table-expanded-row-row-1");
	});

	test("renders a single `<tr>` (no detail row) when `renderExpanded` is omitted", () => {
		render(<Harness />);
		// The base Row harness renders exactly one body row and no expanded detail.
		expect(screen.getAllByRole("row")).toHaveLength(1);
	});
});

describe("expandedRowId encoding", () => {
	test("keeps the aria-controls↔panel id association for a row id containing whitespace", async () => {
		const user = userEvent.setup();
		const spacedData: Row[] = [{ id: "Acme Inc", name: "Acme" }];

		function WhitespaceIdHarness() {
			const [expanded, setExpanded] = useState<ExpandedState>({});
			const cols = useMemo(
				() =>
					expandableColumnHelper.columns([
						expandableColumnHelper.display({
							id: "expander",
							header: () => <DataTable.ExpandHeader />,
							cell: (props) => (
								<DataTable.Cell>
									<DataTable.RowExpandButton row={props.row} label={props.row.original.name} />
								</DataTable.Cell>
							),
						}),
						expandableColumnHelper.accessor("name", {
							id: "name",
							header: () => <DataTable.Header>Name</DataTable.Header>,
							cell: (props) => <DataTable.Cell>{props.getValue()}</DataTable.Cell>,
						}),
					]),
				[],
			);
			const table = useTable({
				features: expandableFeatures,
				data: spacedData,
				columns: cols,
				state: { expanded },
				onExpandedChange: setExpanded,
				getRowCanExpand: () => true,
				getRowId: (row) => row.id, // a row id WITH a space
			});
			return (
				<DataTable.Root table={table}>
					<DataTable.Head />
					<DataTable.Body>
						{table.getRowModel().rows.map((row) => (
							<Fragment key={row.id}>
								<DataTable.Row row={row} />
								{row.getIsExpanded() && (
									<DataTable.ExpandedRow row={row}>
										<span>Detail</span>
									</DataTable.ExpandedRow>
								)}
							</Fragment>
						))}
					</DataTable.Body>
				</DataTable.Root>
			);
		}

		render(<WhitespaceIdHarness />);
		await user.click(screen.getByRole("button", { name: "Show details for Acme" }));

		const button = screen.getByRole("button", { name: "Hide details for Acme" });
		const ariaControls = button.getAttribute("aria-controls");
		invariant(ariaControls, "expanded button should expose aria-controls");
		// Encoded to a valid, whitespace-free IDREF (a space would split it into two
		// tokens and sever the association)…
		expect(ariaControls).not.toContain(" ");
		// …and the panel cell carries the exact same id, so the association resolves.
		expect(document.getElementById(ariaControls)).toBeInTheDocument();
	});
});

describe("DataTable.EmptyRow", () => {
	test("spans every leaf column for a table without `columnVisibilityFeature`", () => {
		// A revert to `table.getVisibleLeafColumns()` throws a `TypeError` here:
		// the method exists on the table only when it registers the feature.
		render(<PlainHarness rows={[]} />);
		expect(screen.getByRole("cell", { name: "No results." })).toHaveAttribute("colspan", "3");
	});

	test("spans the visible leaf columns only when the table registers `columnVisibilityFeature`", () => {
		// A revert to `table.getAllLeafColumns()` counts the hidden `name` column too.
		render(<VisibilityHarness rows={[]} />);
		expect(screen.getByRole("cell", { name: "No results." })).toHaveAttribute("colspan", "2");
	});
});

/**
 * Type-level contracts, owned by `pnpm typecheck` rather than by a `test()`: a
 * `@ts-expect-error` that compiles is the assertion, and pairing it with a runtime
 * `expect` would read as coverage the vitest run does not have.
 *
 * `DataTable.HeaderSortButton` and `DataTable.RowExpandButton` call a feature's
 * API, so each rejects an instance from a table that never registered the
 * feature. `features` above registers none.
 */
export function typeLevelContracts(
	column: Column<typeof features, Row, string>,
	row: TableRow<typeof features, Row>,
) {
	return (
		<>
			{/* @ts-expect-error -- the table registers no rowSortingFeature */}
			<DataTable.HeaderSortButton column={column} sortingMode="alphanumeric">
				Name
			</DataTable.HeaderSortButton>
			{/* @ts-expect-error -- the table registers no rowExpandingFeature */}
			<DataTable.RowExpandButton row={row} label="Alice" />
		</>
	);
}

// Why `rowExpandingFeature` alone: a detail panel needs `row.getIsExpanded()` and
// `row.toggleExpanded()`, which the feature adds. `expandedRowModel` only flattens
// sub-rows into the row model, so a flat table can leave it out.
const detailFeatures = tableFeatures({ rowExpandingFeature });
const detailColumnHelper = createColumnHelper<typeof detailFeatures, Row>();
const detailColumns = detailColumnHelper.columns([
	detailColumnHelper.display({
		id: "expander",
		header: () => <DataTable.ExpandHeader />,
		cell: (props) => (
			<DataTable.Cell>
				<DataTable.RowExpandButton row={props.row} label={props.row.original.name} />
			</DataTable.Cell>
		),
	}),
	detailColumnHelper.accessor("name", {
		id: "name",
		header: () => <DataTable.Header>Name</DataTable.Header>,
		cell: (props) => <DataTable.Cell>{props.getValue()}</DataTable.Cell>,
	}),
]);

function DetailOnlyHarness() {
	const table = useTable({
		features: detailFeatures,
		data,
		columns: detailColumns,
		getRowCanExpand: () => true,
	});
	return (
		<DataTable.Root table={table}>
			<DataTable.Head />
			<DataTable.Body>
				{table.getRowModel().rows.map((row) => (
					<DataTable.Row
						key={row.id}
						row={row}
						renderExpanded={(row) => <span data-testid="panel">Panel for {row.original.name}</span>}
					/>
				))}
			</DataTable.Body>
		</DataTable.Root>
	);
}

describe("DataTable.Row renderExpanded without expandedRowModel", () => {
	test("a table with only `rowExpandingFeature` opens and closes a detail panel", async () => {
		const user = userEvent.setup();
		render(<DetailOnlyHarness />);
		expect(screen.queryByTestId("panel")).not.toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: "Show details for Alice" }));

		const button = screen.getByRole("button", { name: "Hide details for Alice" });
		expect(button).toHaveAttribute("aria-expanded", "true");
		expect(screen.getByTestId("panel").closest("td")).toHaveAttribute("colspan", "2");

		await user.click(button);

		expect(screen.getByRole("button", { name: "Show details for Alice" })).toHaveAttribute(
			"aria-expanded",
			"false",
		);
		expect(screen.queryByTestId("panel")).not.toBeInTheDocument();
	});
});

const selectionFeatures = tableFeatures({ rowSelectionFeature });
const selectionColumnHelper = createColumnHelper<typeof selectionFeatures, Row>();
const selectionColumns = selectionColumnHelper.columns([
	selectionColumnHelper.accessor("name", {
		id: "name",
		header: () => <DataTable.Header>Name</DataTable.Header>,
		// The cell reads state through the stable `row`, the pattern TanStack's
		// React Compiler guide flags as stale under compilation.
		cell: (props) => (
			<DataTable.Cell>
				{props.getValue()} is {props.row.getIsSelected() ? "selected" : "not selected"}
			</DataTable.Cell>
		),
	}),
]);

function SelectionHarness() {
	const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
	const table = useTable({
		features: selectionFeatures,
		data,
		columns: selectionColumns,
		state: { rowSelection },
		onRowSelectionChange: setRowSelection,
		getRowId: (row) => row.id,
	});
	const rows = table.getRowModel().rows;
	return (
		<>
			<button type="button" onClick={() => rows[0]?.toggleSelected()}>
				Toggle Alice
			</button>
			<DataTable.Root table={table}>
				<DataTable.Body>
					{rows.map((row) => (
						<DataTable.Row key={row.id} row={row} />
					))}
				</DataTable.Body>
			</DataTable.Root>
		</>
	);
}

describe("DataTable.Row state subscription", () => {
	test("re-renders a cell that reads selection state through `row` when the selection changes", async () => {
		// The compiled row keeps the same `row` prop across the change, so only its
		// whole-state subscription re-runs the cell renderer. A selector narrowed to
		// the row's expansion state leaves the cell at "not selected".
		const user = userEvent.setup();
		render(<SelectionHarness />);
		expect(screen.getByRole("cell", { name: "Alice is not selected" })).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: "Toggle Alice" }));

		expect(screen.getByRole("cell", { name: "Alice is selected" })).toBeInTheDocument();
	});
});

function VisibilityToggleHarness() {
	const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({});
	const table = useTable({
		features: visibilityFeatures,
		data,
		columns: visibilityColumns,
		state: { columnVisibility },
		onColumnVisibilityChange: setColumnVisibility,
		getRowId: (row) => row.id,
	});
	const rows = table.getRowModel().rows;
	return (
		<>
			<button type="button" onClick={() => table.getColumn("name")?.toggleVisibility()}>
				Toggle name
			</button>
			<DataTable.Root table={table}>
				<DataTable.Head />
				<DataTable.Body>
					{rows.map((row) => (
						<Fragment key={row.id}>
							<DataTable.Row row={row} />
							<DataTable.ExpandedRow data-testid={`detail-${row.id}`} row={row}>
								<span>Detail</span>
							</DataTable.ExpandedRow>
						</Fragment>
					))}
				</DataTable.Body>
			</DataTable.Root>
		</>
	);
}

/** Columns whose `cell` closes over a value of the rendering component. */
function ClosureHarness() {
	const [label, setLabel] = useState("before");
	const closureColumns = useMemo(
		() =>
			columnHelper.columns([
				columnHelper.accessor("name", {
					id: "name",
					header: () => <DataTable.Header>Name</DataTable.Header>,
					cell: (props) => (
						<DataTable.Cell>
							{props.getValue()} {label}
						</DataTable.Cell>
					),
				}),
			]),
		[label],
	);
	const table = useTable({ features, data, columns: closureColumns });
	return (
		<>
			<button type="button" onClick={() => setLabel("after")}>
				Relabel
			</button>
			<DataTable.Root table={table}>
				<DataTable.Body>
					{table.getRowModel().rows.map((row) => (
						<DataTable.Row key={row.id} row={row} />
					))}
				</DataTable.Body>
			</DataTable.Root>
		</>
	);
}

describe("DataTable.Row options subscription", () => {
	test("re-renders its cells when a new `columns` array arrives with the same `row` and state", async () => {
		// TanStack keeps the `row` object across a `columns` change and the store state
		// does not move, so only the options half of the selector re-runs the cells.
		const user = userEvent.setup();
		render(<ClosureHarness />);
		expect(screen.getByRole("cell", { name: "Alice before" })).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: "Relabel" }));

		expect(screen.getByRole("cell", { name: "Alice after" })).toBeInTheDocument();
	});
});

describe("DataTable.RowExpandButton options subscription", () => {
	test("disappears when a re-render changes `getRowCanExpand` for the same `row`", () => {
		// `row.getCanExpand()` reads an option, not state. Dropping the options from the
		// selector keeps the toggle mounted after the predicate flips.
		const { rerender } = render(<ExpandableHarness canExpand />);
		expect(screen.getByRole("button", { name: "Show details for Alice" })).toBeInTheDocument();

		rerender(<ExpandableHarness canExpand={false} />);

		expect(screen.queryByRole("button")).not.toBeInTheDocument();
	});
});

/** Renders a detail row under the only data row, with two or three columns. */
function ColumnCountHarness({ withExtraColumn }: { withExtraColumn: boolean }) {
	const countColumns = useMemo(
		() =>
			columnHelper.columns([
				columnHelper.accessor("id", {
					id: "id",
					header: () => <DataTable.Header>ID</DataTable.Header>,
					cell: (props) => <DataTable.Cell>{props.getValue()}</DataTable.Cell>,
				}),
				columnHelper.accessor("name", {
					id: "name",
					header: () => <DataTable.Header>Name</DataTable.Header>,
					cell: (props) => <DataTable.Cell>{props.getValue()}</DataTable.Cell>,
				}),
				...(withExtraColumn
					? [
							columnHelper.display({
								id: "extra",
								header: () => <DataTable.Header>Extra</DataTable.Header>,
								cell: () => <DataTable.Cell>extra</DataTable.Cell>,
							}),
						]
					: []),
			]),
		[withExtraColumn],
	);
	const table = useTable({ features, data, columns: countColumns, getRowId: (row) => row.id });
	return (
		<DataTable.Root table={table}>
			<DataTable.Head />
			<DataTable.Body>
				{table.getRowModel().rows.map((row) => (
					<Fragment key={row.id}>
						<DataTable.Row row={row} />
						<DataTable.ExpandedRow data-testid={`detail-${row.id}`} row={row}>
							<span>Detail</span>
						</DataTable.ExpandedRow>
					</Fragment>
				))}
			</DataTable.Body>
		</DataTable.Root>
	);
}

describe("DataTable.ExpandedRow options subscription", () => {
	test("its `colSpan` follows a new `columns` array for the same `row`", () => {
		// The cell count changes through the options, not the store, so dropping the
		// options from the selector leaves `colspan` at 2.
		const { rerender } = render(<ColumnCountHarness withExtraColumn={false} />);
		const detailCell = () =>
			within(screen.getByTestId("detail-row-1")).getByText("Detail").closest("td");
		expect(detailCell()).toHaveAttribute("colspan", "2");

		rerender(<ColumnCountHarness withExtraColumn />);

		expect(detailCell()).toHaveAttribute("colspan", "3");
	});
});

describe("DataTable.ExpandedRow state subscription", () => {
	test("its `colSpan` follows a column visibility change while the `row` prop stays the same", async () => {
		// The compiled panel keeps the same `row` prop, so only its subscription to
		// the visible cell count re-renders it. A count read in the component body
		// leaves `colspan` at 3 after the toggle.
		const user = userEvent.setup();
		render(<VisibilityToggleHarness />);
		const detailCell = () =>
			within(screen.getByTestId("detail-row-1")).getByText("Detail").closest("td");
		expect(detailCell()).toHaveAttribute("colspan", "3");

		await user.click(screen.getByRole("button", { name: "Toggle name" }));

		expect(detailCell()).toHaveAttribute("colspan", "2");
	});
});

type TeamRow = { id: string; team: string; name: string };

const groupingFeatures = tableFeatures({
	columnGroupingFeature,
	groupedRowModel: createGroupedRowModel(),
	rowExpandingFeature,
	expandedRowModel: createExpandedRowModel(),
});
const groupingColumnHelper = createColumnHelper<typeof groupingFeatures, TeamRow>();
const groupingColumns = groupingColumnHelper.columns([
	groupingColumnHelper.accessor("team", {
		id: "team",
		header: () => <DataTable.Header>Team</DataTable.Header>,
		cell: (props) => <DataTable.Cell>{props.getValue()}</DataTable.Cell>,
	}),
	groupingColumnHelper.accessor("name", {
		id: "name",
		header: () => <DataTable.Header>Name</DataTable.Header>,
		cell: (props) => <DataTable.Cell>{props.getValue()}</DataTable.Cell>,
	}),
]);
const teamData: TeamRow[] = [
	{ id: "row-1", team: "web", name: "Alice" },
	{ id: "row-2", team: "web", name: "Bob" },
	{ id: "row-3", team: "api", name: "Cleo" },
];

function GroupingHarness() {
	const table = useTable({
		features: groupingFeatures,
		data: teamData,
		columns: groupingColumns,
		initialState: { grouping: ["team"], expanded: true },
	});
	return (
		<DataTable.Root table={table}>
			<DataTable.Head />
			<DataTable.Body>
				{table.getRowModel().rows.map((row) => (
					<DataTable.Row
						key={row.id}
						data-testid={row.getIsGrouped() ? "group-row" : "leaf-row"}
						row={row}
					/>
				))}
			</DataTable.Body>
		</DataTable.Root>
	);
}

describe("DataTable.Row with grouping", () => {
	// Why this pins `flexRender`: a leaf row under a group carries a placeholder
	// cell in the grouping column. TanStack's `FlexRender` component renders
	// `null` for it, which drops the `<td>` and shifts every later cell left.
	test("keeps one `<td>` per leaf column on group rows and leaf rows, placeholder cells included", () => {
		render(<GroupingHarness />);
		const groupRows = screen.getAllByTestId("group-row");
		const leafRows = screen.getAllByTestId("leaf-row");
		expect(groupRows).toHaveLength(2);
		expect(leafRows).toHaveLength(3);
		for (const row of [...groupRows, ...leafRows]) {
			expect(within(row).getAllByRole("cell")).toHaveLength(2);
		}
		const [firstLeaf] = leafRows;
		invariant(firstLeaf, "expected a leaf row");
		expect(within(firstLeaf).getAllByRole("cell")[0]).toHaveTextContent("web");
	});
});
