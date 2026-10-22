import { act, fireEvent, render, screen } from "@testing-library/react";
import { type ComponentProps, useMemo } from "react";
import invariant from "tiny-invariant";
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import type { ButtonAppearance, ButtonIntent } from "../button/index.js";
import {
	DataTable,
	createColumnHelper,
	createExpandedRowModel,
	createSortedRowModel,
	rowExpandingFeature,
	rowSortingFeature,
	sortFn_alphanumeric,
	tableFeatures,
	useTable,
} from "./index.js";

type Row = { id: string; name: string; email: string };

const features = tableFeatures({});
const columnHelper = createColumnHelper<typeof features, Row>();
const columns = columnHelper.columns([
	columnHelper.accessor("name", {
		id: "name",
		header: () => <DataTable.Header>Name</DataTable.Header>,
		cell: (props) => <DataTable.Cell>{props.getValue()}</DataTable.Cell>,
	}),
	columnHelper.accessor("email", {
		id: "email",
		header: () => <DataTable.Header>Email</DataTable.Header>,
		cell: (props) => <DataTable.Cell>{props.getValue()}</DataTable.Cell>,
	}),
]);
const data: Row[] = [{ id: "row-1", name: "Alice", email: "alice@example.com" }];

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

// Why browser mode: the guard reads the live `Selection`, and only a real mouse
// drag proves that the browser fires `click` on the row after it selects text.
describe("DataTable.Row (browser) — text selection", () => {
	test("a drag-select across the row's cells skips onClick; a click on unselected text runs it", async () => {
		const handleClick = vi.fn<() => void>();
		render(<Harness onClick={handleClick} />);
		const nameCell = screen.getByRole("cell", { name: "Alice" });

		// A real drag: mouse down on the name, move to the email, mouse up. The
		// browser selects the text between and fires `click` on the common
		// ancestor, the row.
		await userEvent.dragAndDrop(nameCell, screen.getByRole("cell", { name: "alice@example.com" }));

		expect(document.getSelection()?.isCollapsed).toBe(false);
		expect(handleClick).not.toHaveBeenCalled();

		// A click on selected text collapses the selection on mouseup, after the
		// browser has already decided the click, so that click only deselects.
		await userEvent.click(nameCell);
		expect(document.getSelection()?.isCollapsed).toBe(true);
		expect(handleClick).not.toHaveBeenCalled();

		// With nothing selected, the same click runs the handler.
		await userEvent.click(nameCell);
		expect(handleClick).toHaveBeenCalledTimes(1);
	});

	test("a selection anchored outside the row does not block onClick", () => {
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

const sortableFeatures = tableFeatures({
	rowSortingFeature,
	sortedRowModel: createSortedRowModel(),
	sortFns: { alphanumeric: sortFn_alphanumeric },
});
const sortableColumnHelper = createColumnHelper<typeof sortableFeatures, Row>();

// Why inline CSS: the browser project loads no Tailwind, so the two text
// utilities the mute gate chooses between are bare classes until these rules
// define them.
const HEADER_STYLE = `
.text-muted { color: rgb(1, 2, 3); }
.text-danger-600 { color: rgb(4, 5, 6); }
`;

type SortableHeaderHarnessProps = {
	appearance?: ButtonAppearance;
	intent?: ButtonIntent;
};

function SortableHeaderHarness({ appearance, intent }: SortableHeaderHarnessProps) {
	const sortableColumns = useMemo(
		() =>
			sortableColumnHelper.columns([
				sortableColumnHelper.accessor("name", {
					id: "name",
					header: (props) => (
						<DataTable.Header column={props.column}>
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
			]),
		[appearance, intent],
	);
	const table = useTable({ features: sortableFeatures, data, columns: sortableColumns });
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

// Why browser mode: the mute is a class tailwind-merge weighs against the tone
// class, so only the computed color shows which one survived the merge.
describe("DataTable.HeaderSortButton (browser) — muted header text", () => {
	let styleElement: HTMLStyleElement;

	beforeAll(() => {
		styleElement = document.createElement("style");
		styleElement.textContent = HEADER_STYLE;
		document.head.appendChild(styleElement);
	});

	afterAll(() => {
		styleElement.remove();
	});

	test("mutes the default ghost + neutral header", () => {
		render(<SortableHeaderHarness />);
		const button = screen.getByRole("button", { name: "Name" });
		expect(getComputedStyle(button).color).toBe("rgb(1, 2, 3)");
	});

	test("keeps a danger intent's tone instead of muting it", () => {
		render(<SortableHeaderHarness appearance="outlined" intent="danger" />);
		const button = screen.getByRole("button", { name: "Name" });
		expect(getComputedStyle(button).color).toBe("rgb(4, 5, 6)");
	});
});

type TreeRow = { id: string; name: string; subRows?: TreeRow[] };

const treeFeatures = tableFeatures({
	rowExpandingFeature,
	expandedRowModel: createExpandedRowModel(),
});
const treeColumnHelper = createColumnHelper<typeof treeFeatures, TreeRow>();
const treeColumns = treeColumnHelper.columns([
	treeColumnHelper.display({
		id: "expander",
		cell: (props) => (
			<DataTable.ControlCell>
				<DataTable.RowExpandButton row={props.row} label={props.row.original.name} />
			</DataTable.ControlCell>
		),
	}),
	treeColumnHelper.accessor("name", {
		id: "name",
		cell: (props) => <DataTable.Cell>{props.getValue()}</DataTable.Cell>,
	}),
]);
const twoParents: TreeRow[] = [
	{
		id: "a",
		name: "a",
		subRows: [
			{ id: "a-1", name: "a-1" },
			{ id: "a-2", name: "a-2" },
		],
	},
	{
		id: "b",
		name: "b",
		subRows: [
			{ id: "b-1", name: "b-1" },
			{ id: "b-2", name: "b-2" },
		],
	},
	{ id: "tail", name: "tail" },
];

type TreeHarnessProps = {
	data: TreeRow[];
	/** Render a detail panel for each row, and select no state in `useTable`. */
	withPanelsAndNoState?: boolean;
};

function TreeHarness({ data, withPanelsAndNoState = false }: TreeHarnessProps) {
	const table = useTable(
		{
			features: treeFeatures,
			data,
			columns: treeColumns,
			getRowCanExpand: withPanelsAndNoState ? () => true : undefined,
			getSubRows: (row) => row.subRows,
			getRowId: (row) => row.id,
		},
		// A selector that leaves out the expanded state: `DataTable.Root` and this
		// component do not render again when a row expands.
		withPanelsAndNoState ? () => null : undefined,
	);
	return (
		<DataTable.Root table={table}>
			<DataTable.Body>
				{table.getRowModel().rows.map((row) => (
					<DataTable.Row
						key={row.id}
						row={row}
						renderExpanded={withPanelsAndNoState ? () => <span>Panel</span> : undefined}
					/>
				))}
			</DataTable.Body>
		</DataTable.Root>
	);
}

// Why inline CSS: the browser project loads no Tailwind. A tall panel gives its
// slide a long distance.
const ROW_STYLE = `[data-expanded-content] > td { height: 40px; }`;

function rowOf(text: string): HTMLTableRowElement {
	const row = screen.getByText(text).closest("tr");
	invariant(row, `expected a row for ${text}`);
	return row;
}

/** The offset the row that holds `text` shows at, `translate` included. */
function shownTop(text: string): number {
	return rowOf(text).getBoundingClientRect().top;
}

/** Whether the row that holds `text` has stopped sliding. */
function isSettled(text: string): boolean {
	return rowOf(text).getAnimations().length === 0;
}

/** Stop each slide where it is, so a read before and after a commit compares one instant. */
function pauseSlides(): void {
	for (const animation of document.getAnimations()) {
		animation.pause();
	}
}

/** Run each slide to its end. */
function finishSlides(): void {
	for (const animation of document.getAnimations()) {
		animation.finish();
	}
}

/** Click a toggle and run the commit and its slide setup, but no frame. */
async function clickToggle(name: string): Promise<void> {
	const button = screen.getByRole("button", { name });
	await act(async () => {
		button.click();
	});
}

describe("DataTable row motion (browser)", () => {
	let styleElement: HTMLStyleElement;

	beforeAll(() => {
		styleElement = document.createElement("style");
		styleElement.textContent = ROW_STYLE;
		document.head.appendChild(styleElement);
	});

	afterAll(() => {
		styleElement.remove();
	});

	test("slides the rows below a detail panel when no render of the root follows the expand", async () => {
		render(
			<TreeHarness
				data={[
					{ id: "a", name: "a" },
					{ id: "tail", name: "tail" },
				]}
				withPanelsAndNoState
			/>,
		);
		const startTop = shownTop("tail");

		await clickToggle("Show details for a");

		// The panel is in the layout, but the row below starts where it was.
		expect(screen.getByText("Panel")).toBeInTheDocument();
		expect(shownTop("tail")).toBeCloseTo(startTop, 0);
		finishSlides();
		expect(isSettled("tail")).toBe(true);
		expect(shownTop("tail")).toBeGreaterThan(startTop + 40);
	});

	test("continues a slide from where the row shows when a second row expands", async () => {
		render(<TreeHarness data={twoParents} />);
		const startTop = shownTop("tail");
		await clickToggle("Expand a");
		pauseSlides();
		for (const animation of rowOf("tail").getAnimations()) {
			animation.currentTime = 30;
		}
		const midTop = shownTop("tail");
		expect(midTop).toBeGreaterThan(startTop);

		await clickToggle("Expand b");

		expect(shownTop("tail")).toBeCloseTo(midTop, 0);
		finishSlides();
		expect(isSettled("tail")).toBe(true);
	});

	test("keeps the rows below in place when a collapse commits during another", async () => {
		vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
		render(<TreeHarness data={twoParents} />);
		const endTop = shownTop("tail");
		await clickToggle("Expand a");
		await clickToggle("Expand b");
		finishSlides();

		await clickToggle("Collapse a");
		await act(() => vi.advanceTimersByTimeAsync(100));
		await clickToggle("Collapse b");
		pauseSlides();
		const shownBefore = { b: shownTop("b"), tail: shownTop("tail") };
		// Run to the first collapse's commit only.
		await act(() => vi.advanceTimersByTimeAsync(100));

		expect(screen.queryByText("a-1")).not.toBeInTheDocument();
		expect(screen.getByText("b-1")).toBeInTheDocument();
		expect(shownTop("b")).toBeCloseTo(shownBefore.b, 0);
		expect(shownTop("tail")).toBeCloseTo(shownBefore.tail, 0);

		await act(() => vi.advanceTimersByTimeAsync(100));
		finishSlides();
		expect(screen.queryByText("b-1")).not.toBeInTheDocument();
		expect(isSettled("tail")).toBe(true);
		expect(shownTop("tail")).toBeCloseTo(endTop, 0);
	});
});
