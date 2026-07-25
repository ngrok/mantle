import { render, screen, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import {
	type ComponentProps,
	Fragment,
	type MouseEvent,
	type ReactNode,
	useMemo,
	useState,
} from "react";
import invariant from "tiny-invariant";
import { describe, expect, test, vi } from "vitest";
import type { SortingMode } from "../../utils/sorting/direction.js";
import type { ButtonAppearance, ButtonIntent, IconButtonAppearance } from "../button/index.js";
import {
	DataTable,
	type ExpandedState,
	type Row as TableRow,
	createColumnHelper,
	getCoreRowModel,
	getExpandedRowModel,
	getSortedRowModel,
	useReactTable,
} from "./index.js";
// NOT from `./index.js`: that re-exports TanStack's own `SortDirection` ("asc" | "desc"),
// which is a different type from mantle's (it also has "unsorted").
import type { SortDirection } from "./types.js";

type Row = { id: string; name: string };

const columnHelper = createColumnHelper<Row>();
const columns = [
	columnHelper.accessor("name", {
		id: "name",
		header: () => <DataTable.Header>Name</DataTable.Header>,
		cell: (props) => <DataTable.Cell>{props.getValue()}</DataTable.Cell>,
	}),
];
const data: Row[] = [{ id: "row-1", name: "Alice" }];

function Harness(props: Omit<ComponentProps<typeof DataTable.Row>, "row">) {
	const table = useReactTable({
		data,
		columns,
		getCoreRowModel: getCoreRowModel(),
	});
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

describe("DataTable.Row", () => {
	// The `cursor-pointer` assertions in this block pin the class directly because
	// that class IS the documented contract: the docs page and the `Row` JSDoc
	// both promise "the row automatically receives `cursor-pointer`" when `onClick`
	// is set, tell consumers not to add it themselves, and document overriding it
	// with another `cursor-*` class. The row exposes no data attribute for
	// interactivity, so nothing else can observe the affordance or the tw-merge
	// override.
	test("applies `cursor-pointer` when `onClick` is provided", () => {
		render(<Harness onClick={() => {}} />);
		const row = screen.getByTestId("row");
		expect(row).toHaveAttribute("data-slot", "data-table-row");
		expect(row).toHaveClass("cursor-pointer");
	});

	test("does not apply `cursor-pointer` when no `onClick` is provided", () => {
		render(<Harness />);
		const row = screen.getByTestId("row");
		expect(row).toHaveAttribute("data-slot", "data-table-row");
		expect(row).not.toHaveClass("cursor-pointer");
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
});

/** Deliberately NOT in alphabetical order, so a sort visibly reorders it. */
const sortableData: Row[] = [
	{ id: "row-c", name: "Charlie" },
	{ id: "row-a", name: "Alice" },
	{ id: "row-b", name: "Bob" },
];
const unsortedOrder = ["Charlie", "Alice", "Bob"];
const ascendingOrder = ["Alice", "Bob", "Charlie"];
const descendingOrder = ["Charlie", "Bob", "Alice"];

type SortableHarnessProps = {
	appearance?: ButtonAppearance;
	intent?: ButtonIntent;
	/** Consumer `onClick`, which runs before the toggle and can veto it. */
	onHeaderClick?: (event: MouseEvent<HTMLButtonElement>) => void;
	sortIcon?: (sortDirection: SortDirection) => ReactNode;
	sortingMode?: SortingMode;
};

/**
 * Renders a table with a single sortable column, wired with TanStack's sorted row
 * model so `DataTable.HeaderSortButton` can be clicked through its real sort
 * cycle (and the resulting row order observed).
 */
function SortableHarness({
	appearance,
	intent,
	onHeaderClick,
	sortIcon,
	sortingMode = "alphanumeric",
}: SortableHarnessProps) {
	const sortableColumns = useMemo(
		() => [
			columnHelper.accessor("name", {
				id: "name",
				header: (props) => (
					<DataTable.Header>
						<DataTable.HeaderSortButton
							column={props.column}
							sortingMode={sortingMode}
							appearance={appearance}
							intent={intent}
							onClick={onHeaderClick}
							sortIcon={sortIcon}
						>
							Name
						</DataTable.HeaderSortButton>
					</DataTable.Header>
				),
				cell: (props) => <DataTable.Cell>{props.getValue()}</DataTable.Cell>,
			}),
		],
		[appearance, intent, onHeaderClick, sortIcon, sortingMode],
	);
	const table = useReactTable({
		data: sortableData,
		columns: sortableColumns,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getRowId: (row) => row.id,
	});
	return (
		<DataTable.Root table={table}>
			<DataTable.Head />
			<DataTable.Body data-testid="body">
				{table.getRowModel().rows.map((row) => (
					<DataTable.Row key={row.id} row={row} />
				))}
			</DataTable.Body>
		</DataTable.Root>
	);
}

/**
 * The same single column, but with `disableSorting` — which the prop union makes
 * mutually exclusive with `sortingMode`, hence a separate harness.
 */
function DisabledSortingHarness() {
	const unsortableColumns = useMemo(
		() => [
			columnHelper.accessor("name", {
				id: "name",
				header: (props) => (
					<DataTable.Header>
						<DataTable.HeaderSortButton column={props.column} disableSorting>
							Name
						</DataTable.HeaderSortButton>
					</DataTable.Header>
				),
				cell: (props) => <DataTable.Cell>{props.getValue()}</DataTable.Cell>,
			}),
		],
		[],
	);
	const table = useReactTable({
		data: sortableData,
		columns: unsortableColumns,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getRowId: (row) => row.id,
	});
	return (
		<DataTable.Root table={table}>
			<DataTable.Head />
			<DataTable.Body data-testid="body">
				{table.getRowModel().rows.map((row) => (
					<DataTable.Row key={row.id} row={row} />
				))}
			</DataTable.Body>
		</DataTable.Root>
	);
}

/**
 * The sort button's accessible name gains the sr-only announcement once the
 * column is sorted, so match on the label rather than the full name.
 */
function sortButton() {
	return screen.getByRole("button", { name: /Name/ });
}

/** The visible row order of the table body, top to bottom. */
function bodyRowNames() {
	return within(screen.getByTestId("body"))
		.getAllByRole("row")
		.map((row) => row.textContent);
}

describe("DataTable.HeaderSortButton", () => {
	// `text-muted` is pinned as a class in the next two tests because the whole
	// implementation of the muted header tone IS that one conditional class, and no
	// data attribute or other observable exposes it. The pair guards a real
	// regression: `text-muted` is applied only for the default ghost+neutral
	// design, because tw-merge merges the consumer `className` last and an
	// unconditional `text-muted` would strip the tone text color from every
	// non-default `appearance`/`intent` combination.
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
		expect(button).toHaveAttribute("data-intent", "danger");
		expect(button).not.toHaveClass("text-muted");
	});

	test("cycles unsorted → ascending → descending → unsorted for alphanumeric sorting", async () => {
		const user = userEvent.setup();
		render(<SortableHarness sortingMode="alphanumeric" />);

		expect(sortButton()).toHaveAttribute("data-sort-direction", "unsorted");
		expect(sortButton()).toHaveAccessibleName("Name");
		expect(bodyRowNames()).toEqual(unsortedOrder);

		await user.click(sortButton());
		expect(sortButton()).toHaveAttribute("data-sort-direction", "asc");
		expect(sortButton()).toHaveAccessibleName("Column sorted in ascending order Name");
		expect(bodyRowNames()).toEqual(ascendingOrder);

		await user.click(sortButton());
		expect(sortButton()).toHaveAttribute("data-sort-direction", "desc");
		expect(sortButton()).toHaveAccessibleName("Column sorted in descending order Name");
		expect(bodyRowNames()).toEqual(descendingOrder);

		await user.click(sortButton());
		expect(sortButton()).toHaveAttribute("data-sort-direction", "unsorted");
		expect(sortButton()).toHaveAccessibleName("Name");
		expect(bodyRowNames()).toEqual(unsortedOrder);
	});

	test("cycles newest-first for time sorting, announcing the time vocabulary", async () => {
		const user = userEvent.setup();
		render(<SortableHarness sortingMode="time" />);

		expect(sortButton()).toHaveAttribute("data-sort-direction", "unsorted");

		// Time columns lead with descending — newest first — not ascending.
		await user.click(sortButton());
		expect(sortButton()).toHaveAttribute("data-sort-direction", "desc");
		expect(sortButton()).toHaveAccessibleName("Column sorted in newest-to-oldest order Name");
		expect(bodyRowNames()).toEqual(descendingOrder);

		await user.click(sortButton());
		expect(sortButton()).toHaveAttribute("data-sort-direction", "asc");
		expect(sortButton()).toHaveAccessibleName("Column sorted in oldest-to-newest order Name");
		expect(bodyRowNames()).toEqual(ascendingOrder);

		await user.click(sortButton());
		expect(sortButton()).toHaveAttribute("data-sort-direction", "unsorted");
		expect(sortButton()).toHaveAccessibleName("Name");
		expect(bodyRowNames()).toEqual(unsortedOrder);
	});

	test("`disableSorting` makes the click a no-op and announces nothing", async () => {
		const user = userEvent.setup();
		render(<DisabledSortingHarness />);

		await user.click(sortButton());

		expect(sortButton()).toHaveAttribute("data-sort-direction", "unsorted");
		expect(sortButton()).toHaveAccessibleName("Name");
		expect(bodyRowNames()).toEqual(unsortedOrder);
	});

	test("invokes a consumer `onClick` and still toggles the sort", async () => {
		const user = userEvent.setup();
		const handleClick = vi.fn<(event: MouseEvent<HTMLButtonElement>) => void>();
		render(<SortableHarness onHeaderClick={handleClick} />);

		await user.click(sortButton());

		expect(handleClick).toHaveBeenCalledTimes(1);
		expect(sortButton()).toHaveAttribute("data-sort-direction", "asc");
		expect(bodyRowNames()).toEqual(ascendingOrder);
	});

	test("lets a consumer `onClick` veto the toggle via preventDefault", async () => {
		const user = userEvent.setup();
		const handleClick = vi.fn<(event: MouseEvent<HTMLButtonElement>) => void>((event) => {
			event.preventDefault();
		});
		render(<SortableHarness onHeaderClick={handleClick} />);

		await user.click(sortButton());

		expect(handleClick).toHaveBeenCalledTimes(1);
		expect(sortButton()).toHaveAttribute("data-sort-direction", "unsorted");
		expect(bodyRowNames()).toEqual(unsortedOrder);
	});

	test("passes the current sort direction to a `sortIcon` render prop", async () => {
		const user = userEvent.setup();
		const sortIcon = vi.fn<(sortDirection: SortDirection) => ReactNode>((sortDirection) => (
			<svg data-testid="sort-icon" data-direction={sortDirection} />
		));
		render(<SortableHarness sortIcon={sortIcon} />);

		expect(screen.getByTestId("sort-icon")).toHaveAttribute("data-direction", "unsorted");
		expect(sortIcon).toHaveBeenLastCalledWith("unsorted");

		await user.click(sortButton());

		expect(screen.getByTestId("sort-icon")).toHaveAttribute("data-direction", "asc");
		expect(sortIcon).toHaveBeenLastCalledWith("asc");
	});
});

type ExpandableHarnessProps = {
	canExpand?: boolean;
	onRowClick?: () => void;
	buttonOnClick?: (event: MouseEvent<HTMLButtonElement>) => void;
	buttonAppearance?: IconButtonAppearance;
	buttonIntent?: ButtonIntent;
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
	buttonIntent,
	detailColSpan,
}: ExpandableHarnessProps) {
	const [expanded, setExpanded] = useState<ExpandedState>({});
	const expandableColumns = useMemo(
		() => [
			columnHelper.display({
				id: "expander",
				header: () => <DataTable.ExpandHeader />,
				cell: (props) => (
					<DataTable.Cell>
						<DataTable.RowExpandButton
							row={props.row}
							label={props.row.original.name}
							onClick={buttonOnClick}
							appearance={buttonAppearance}
							intent={buttonIntent}
						/>
					</DataTable.Cell>
				),
			}),
			columnHelper.accessor("name", {
				id: "name",
				header: () => <DataTable.Header>Name</DataTable.Header>,
				cell: (props) => <DataTable.Cell>{props.getValue()}</DataTable.Cell>,
			}),
		],
		[buttonOnClick, buttonAppearance, buttonIntent],
	);
	const table = useReactTable({
		data,
		columns: expandableColumns,
		state: { expanded },
		onExpandedChange: setExpanded,
		getRowCanExpand: () => canExpand,
		getCoreRowModel: getCoreRowModel(),
		getExpandedRowModel: getExpandedRowModel(),
		getRowId: (row) => row.id,
	});
	return (
		<DataTable.Root table={table}>
			<DataTable.Head />
			<DataTable.Body data-testid="body">
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

	test("forwards explicit `appearance`/`intent` overrides to the underlying IconButton", () => {
		render(<ExpandableHarness buttonAppearance="outlined" buttonIntent="danger" />);
		const button = screen.getByRole("button", { name: "Show details for Alice" });
		expect(button).toHaveAttribute("data-appearance", "outlined");
		expect(button).toHaveAttribute("data-intent", "danger");
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
});

describe("expanded-state styling hooks", () => {
	test("`data-expanded` tracks the row's expansion and `data-expanded-content` marks the detail row", async () => {
		const user = userEvent.setup();
		render(<ExpandableHarness />);

		// Absent — not `data-expanded="false"` — while collapsed, so `[data-expanded]`
		// selectors only match open rows.
		expect(screen.getByTestId("row-row-1")).not.toHaveAttribute("data-expanded");

		await user.click(screen.getByRole("button", { name: "Show details for Alice" }));

		expect(screen.getByTestId("row-row-1")).toHaveAttribute("data-expanded", "true");
		expect(screen.getByTestId("detail-row-1")).toHaveAttribute("data-expanded-content");

		await user.click(screen.getByRole("button", { name: "Hide details for Alice" }));

		expect(screen.getByTestId("row-row-1")).not.toHaveAttribute("data-expanded");
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

/**
 * Renders a table that drives its detail panel through `DataTable.Row`'s
 * `renderExpanded` prop (rather than a hand-written `ExpandedRow`). `renderSpy`
 * lets tests assert the lazy contract — that the panel is built only while open.
 */
function RenderExpandedHarness({ renderSpy }: { renderSpy?: (row: TableRow<Row>) => void }) {
	const [expanded, setExpanded] = useState<ExpandedState>({});
	const expandableColumns = useMemo(
		() => [
			columnHelper.display({
				id: "expander",
				header: () => <DataTable.ExpandHeader />,
				cell: (props) => (
					<DataTable.Cell>
						<DataTable.RowExpandButton row={props.row} label={props.row.original.name} />
					</DataTable.Cell>
				),
			}),
			columnHelper.accessor("name", {
				id: "name",
				header: () => <DataTable.Header>Name</DataTable.Header>,
				cell: (props) => <DataTable.Cell>{props.getValue()}</DataTable.Cell>,
			}),
		],
		[],
	);
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
		const renderSpy = vi.fn<(row: TableRow<Row>) => void>();
		render(<RenderExpandedHarness renderSpy={renderSpy} />);

		expect(screen.queryByTestId("panel-row-1")).not.toBeInTheDocument();
		expect(renderSpy).not.toHaveBeenCalled();
	});

	test("renders the panel in an ExpandedRow spanning every visible column once expanded", async () => {
		const user = userEvent.setup();
		const renderSpy = vi.fn<(row: TableRow<Row>) => void>();
		render(<RenderExpandedHarness renderSpy={renderSpy} />);

		await user.click(screen.getByRole("button", { name: "Show details for Alice" }));

		// Once, with the row instance whose panel is being built — a `renderExpanded`
		// that received the wrong row (or ran per cell) would show up here.
		expect(renderSpy).toHaveBeenCalledTimes(1);
		expect(renderSpy).toHaveBeenLastCalledWith(expect.objectContaining({ id: "row-1" }));
		expect(screen.getByTestId("panel-row-1")).toHaveTextContent("Panel for Alice");
		const panelCell = screen.getByTestId("panel-row-1").closest("td");
		expect(panelCell).toHaveAttribute("colspan", "2");
		expect(panelCell).toHaveAttribute("id", "data-table-expanded-row-row-1");
	});

	test("injects no extra `<tr>` when `renderExpanded` is omitted, even while expanded", async () => {
		const user = userEvent.setup();
		// `ExpandableHarness` is expansion-configured and renders its own
		// `ExpandedRow`, so an unconditional detail row from `Row` would show up here.
		render(<ExpandableHarness />);

		await user.click(screen.getByRole("button", { name: "Show details for Alice" }));

		// Exactly the data row plus the one hand-written detail row.
		expect(bodyRowNames()).toHaveLength(2);
		expect(screen.getAllByText("Detail for Alice")).toHaveLength(1);
	});
});

describe("expandedRowId encoding", () => {
	test("keeps the aria-controls↔panel id association for a row id containing whitespace", async () => {
		const user = userEvent.setup();
		const spacedData: Row[] = [{ id: "Acme Inc", name: "Acme" }];

		function WhitespaceIdHarness() {
			const [expanded, setExpanded] = useState<ExpandedState>({});
			const cols = useMemo(
				() => [
					columnHelper.display({
						id: "expander",
						header: () => <DataTable.ExpandHeader />,
						cell: (props) => (
							<DataTable.Cell>
								<DataTable.RowExpandButton row={props.row} label={props.row.original.name} />
							</DataTable.Cell>
						),
					}),
					columnHelper.accessor("name", {
						id: "name",
						header: () => <DataTable.Header>Name</DataTable.Header>,
						cell: (props) => <DataTable.Cell>{props.getValue()}</DataTable.Cell>,
					}),
				],
				[],
			);
			const table = useReactTable({
				data: spacedData,
				columns: cols,
				state: { expanded },
				onExpandedChange: setExpanded,
				getRowCanExpand: () => true,
				getCoreRowModel: getCoreRowModel(),
				getExpandedRowModel: getExpandedRowModel(),
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

/**
 * Renders a two-column table (data + pinned actions) whose body switches between
 * rows and `DataTable.EmptyRow`, so the action parts can be checked in both the
 * populated and the empty state.
 */
function ActionHarness({ hasRows }: { hasRows: boolean }) {
	const actionColumns = useMemo(
		() => [
			columnHelper.accessor("name", {
				id: "name",
				header: () => <DataTable.Header>Name</DataTable.Header>,
				cell: (props) => <DataTable.Cell>{props.getValue()}</DataTable.Cell>,
			}),
			columnHelper.display({
				id: "actions",
				header: () => <DataTable.ActionHeader data-testid="action-header" className="w-10" />,
				cell: () => (
					<DataTable.ActionCell data-testid="action-cell" className="p-4">
						<button type="button">Delete</button>
					</DataTable.ActionCell>
				),
			}),
		],
		[],
	);
	const table = useReactTable({
		data: hasRows ? data : [],
		columns: actionColumns,
		getCoreRowModel: getCoreRowModel(),
		getRowId: (row) => row.id,
	});
	const rows = table.getRowModel().rows;

	return (
		<DataTable.Root table={table}>
			<DataTable.Head />
			<DataTable.Body data-testid="body">
				{rows.length > 0 ? (
					rows.map((row) => <DataTable.Row key={row.id} row={row} />)
				) : (
					<DataTable.EmptyRow data-testid="empty-row">No results.</DataTable.EmptyRow>
				)}
			</DataTable.Body>
		</DataTable.Root>
	);
}

describe("DataTable.ActionCell", () => {
	test("marks itself as a sticky right column and hosts its children", () => {
		render(<ActionHarness hasRows />);

		const cell = screen.getByTestId("action-cell");
		// Cross-file contract: `table.tsx` keys its
		// `has-data-mantle-table-sticky-right:` variant off this exact attribute to
		// suppress the container's right-edge scroll fade.
		expect(cell).toHaveAttribute("data-mantle-table-sticky-right", "true");
		expect(cell).toHaveAttribute("data-slot", "data-table-action-cell");
		expect(within(cell).getByRole("button", { name: "Delete" })).toBeInTheDocument();
	});

	test("a consumer `className` beats the default padding", () => {
		render(<ActionHarness hasRows />);

		const cell = screen.getByTestId("action-cell");
		expect(cell).toHaveClass("p-4");
		expect(cell).not.toHaveClass("p-2");
	});

	test("the pinned column's two cross-file selector pairs stay in sync", () => {
		// Both halves of each pair are asserted in this one render because each half is
		// spelled in a different file, and renaming either side alone kills the pinned
		// column's visuals with every other test still green:
		//  1. the aria-hidden indicator strip (data-table.tsx) fades in with
		//     `group-data-sticky-active/table:…`, which resolves only while the root
		//     (table.tsx) keeps the `group/table` group name;
		//  2. the scroll container (table.tsx) suppresses its right-edge fade with
		//     `has-data-mantle-table-sticky-right:…`, which resolves only while this
		//     cell (data-table.tsx) emits `data-mantle-table-sticky-right`.
		const { container } = render(<ActionHarness hasRows />);

		const root = container.querySelector('[data-slot="data-table"]');
		expect(root).toHaveClass("group/table");

		const cell = screen.getByTestId("action-cell");
		const indicator = cell.querySelector("[aria-hidden]");
		expect(indicator).toHaveClass("group-data-sticky-active/table:opacity-100");

		expect(cell).toHaveAttribute("data-mantle-table-sticky-right");
		expect(root?.firstElementChild).toHaveClass(
			"has-data-mantle-table-sticky-right:[--_fade-right:black]",
		);
	});
});

describe("DataTable.ActionHeader", () => {
	test("marks itself sticky and renders the edge indicator when the table has rows", () => {
		render(<ActionHarness hasRows />);

		const header = screen.getByTestId("action-header");
		expect(header).toHaveAttribute("data-mantle-table-sticky-right", "true");
		expect(header).toHaveAttribute("data-slot", "data-table-action-header");
		expect(header).toHaveClass("w-10");
		// The sticky-edge indicator strip is the header's only child here.
		expect(header).not.toBeEmptyDOMElement();
	});

	test("drops the sticky marker and indicator in the empty state", () => {
		render(<ActionHarness hasRows={false} />);

		const header = screen.getByTestId("action-header");
		// Without rows there is nothing to pin, so the container's scroll fade must
		// NOT be suppressed.
		expect(header).not.toHaveAttribute("data-mantle-table-sticky-right");
		expect(header).toBeEmptyDOMElement();
	});
});

describe("DataTable.EmptyRow", () => {
	test("renders one full-width cell hosting the empty state", () => {
		render(<ActionHarness hasRows={false} />);

		const emptyRow = screen.getByTestId("empty-row");
		expect(emptyRow).toHaveAttribute("data-slot", "data-table-empty-row");

		// `getByRole` also proves exclusivity: a second cell would make it throw.
		const cell = within(emptyRow).getByRole("cell");
		// Two columns: name + actions.
		expect(cell).toHaveAttribute("colspan", "2");
		// The children belong INSIDE the cell — a node between `<tr>` and `<td>` is
		// invalid table markup.
		expect(within(cell).getByText("No results.")).toBeInTheDocument();
	});

	test("is the body's only row when there is no data", () => {
		render(<ActionHarness hasRows={false} />);

		expect(bodyRowNames()).toEqual(["No results."]);
	});
});
