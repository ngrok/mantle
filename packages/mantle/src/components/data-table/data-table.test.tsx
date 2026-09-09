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
	DataTable,
	type ExpandedState,
	type Row as TableRow,
	createColumnHelper,
	getCoreRowModel,
	getExpandedRowModel,
	useReactTable,
} from "./index.js";

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

	test("skips `onClick` when the click ends a text selection inside the row", async () => {
		const user = userEvent.setup();
		const handleClick = vi.fn<() => void>();
		render(<Harness onClick={handleClick} />);
		const cell = screen.getByRole("cell", { name: "Alice" });

		// Drag-select "Ali": press at the start of the cell text, move, release.
		await user.pointer([
			{ keys: "[MouseLeft>]", target: cell, offset: 0 },
			{ target: cell, offset: 3 },
			{ keys: "[/MouseLeft]" },
		]);

		expect(document.getSelection()?.toString()).toBe("Ali");
		expect(handleClick).not.toHaveBeenCalled();
	});

	test("runs `onClick` when a selection that survives the click is anchored outside the row", () => {
		const handleClick = vi.fn<() => void>();
		render(
			<>
				<p>Elsewhere</p>
				<Harness onClick={handleClick} />
			</>,
		);
		document.getSelection()?.selectAllChildren(screen.getByText("Elsewhere"));

		// Synthesized on purpose: a real mousedown collapses the selection, and the
		// guard must ignore a selection that is not anchored in this row either way.
		fireEvent.click(screen.getByTestId("row"));
		expect(handleClick).toHaveBeenCalledTimes(1);
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
		() => [
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
		],
		[onCellClick, onButtonClick],
	);
	const table = useReactTable({
		data,
		columns: actionColumns,
		getCoreRowModel: getCoreRowModel(),
	});
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
		() => [
			columnHelper.accessor("name", {
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
		],
		[appearance, disableSorting, disabledHeaderRef, enableSorting, intent],
	);
	const table = useReactTable({
		data,
		columns: sortableColumns,
		getCoreRowModel: getCoreRowModel(),
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
		() => [
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
		],
		[],
	);
	const table = useReactTable({
		data: rows,
		columns: actionColumns,
		getCoreRowModel: getCoreRowModel(),
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

describe("DataTable.ActionHeader", () => {
	test('names the column "Actions" by default', () => {
		const columns = [
			columnHelper.display({
				id: "actions",
				header: () => <DataTable.ActionHeader />,
				cell: () => <DataTable.ActionCell>Edit</DataTable.ActionCell>,
			}),
		];
		function DefaultLabelHarness() {
			const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() });
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
		[buttonOnClick, buttonAppearance],
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

		expect(renderSpy).toHaveBeenCalled();
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

describe("DataTable.EmptyRow", () => {
	test("spans the visible leaf columns only, not hidden ones", () => {
		const columns = [
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
			columnHelper.display({
				id: "actions",
				header: () => <DataTable.ActionHeader />,
				cell: () => <DataTable.ActionCell>Edit</DataTable.ActionCell>,
			}),
		];
		function EmptyHarness() {
			const table = useReactTable({
				data: [],
				columns,
				state: { columnVisibility: { name: false } },
				getCoreRowModel: getCoreRowModel(),
			});
			return (
				<DataTable.Root table={table}>
					<DataTable.Head />
					<DataTable.Body>
						<DataTable.EmptyRow>No results.</DataTable.EmptyRow>
					</DataTable.Body>
				</DataTable.Root>
			);
		}
		render(<EmptyHarness />);
		expect(screen.getByRole("cell", { name: "No results." })).toHaveAttribute("colspan", "2");
	});
});
