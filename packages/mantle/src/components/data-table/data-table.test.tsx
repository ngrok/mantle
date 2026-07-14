import { render, screen, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { type ComponentProps, Fragment, type MouseEvent, useMemo, useState } from "react";
import invariant from "tiny-invariant";
import { describe, expect, test, vi } from "vitest";
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
});

type SortableHarnessProps = {
	appearance?: ButtonAppearance;
	intent?: ButtonIntent;
};

/**
 * Renders a table with a single sortable column so `DataTable.HeaderSortButton`'s
 * optional `appearance`/`intent` pass-through can be exercised.
 */
function SortableHarness({ appearance, intent }: SortableHarnessProps) {
	const sortableColumns = useMemo(
		() => [
			columnHelper.accessor("name", {
				id: "name",
				header: (props) => (
					<DataTable.Header>
						<DataTable.HeaderSortButton
							column={props.column}
							sortingMode="alphanumeric"
							appearance={appearance}
							intent={intent}
						>
							Name
						</DataTable.HeaderSortButton>
					</DataTable.Header>
				),
				cell: (props) => <DataTable.Cell>{props.getValue()}</DataTable.Cell>,
			}),
		],
		[appearance, intent],
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
