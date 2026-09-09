import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import invariant from "tiny-invariant";
import { describe, expect, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { DataTable, createColumnHelper, getCoreRowModel, useReactTable } from "./index.js";

type Row = { id: string; name: string; email: string };

const columnHelper = createColumnHelper<Row>();
const columns = [
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
];
const data: Row[] = [{ id: "row-1", name: "Alice", email: "alice@example.com" }];

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
