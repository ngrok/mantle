import { fireEvent, render, screen } from "@testing-library/react";
import { type ComponentProps, useMemo } from "react";
import invariant from "tiny-invariant";
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import type { ButtonAppearance, ButtonIntent } from "../button/index.js";
import {
	DataTable,
	createColumnHelper,
	createSortedRowModel,
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
