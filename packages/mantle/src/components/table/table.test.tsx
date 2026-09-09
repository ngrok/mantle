import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { Table } from "./table.js";

function renderTable() {
	return render(
		<Table.Root data-testid="root">
			<Table.Element>
				<Table.Caption>Recent invoices</Table.Caption>
				<Table.Head>
					<Table.Row>
						<Table.Header>Invoice</Table.Header>
						<Table.Header scope="colgroup">Amount</Table.Header>
					</Table.Row>
				</Table.Head>
				<Table.Body>
					<Table.Row>
						<Table.Cell>INV001</Table.Cell>
						<Table.Cell>$250.00</Table.Cell>
					</Table.Row>
				</Table.Body>
				<Table.Foot>
					<Table.Row>
						<Table.Cell colSpan={2}>Total</Table.Cell>
					</Table.Row>
				</Table.Foot>
			</Table.Element>
		</Table.Root>,
	);
}

describe("Table", () => {
	test.each([
		["table", "root"],
		["table-element", "table"],
		["table-caption", "caption"],
		["table-head", "thead"],
		["table-body", "tbody"],
		["table-foot", "tfoot"],
		["table-row", "tr"],
		["table-header", "th"],
		["table-cell", "td"],
	])("stamps data-slot=%s on the %s element", (slot, tag) => {
		const { container } = renderTable();
		const element = container.querySelector(`[data-slot="${slot}"]`);
		expect(element).not.toBeNull();
		const expectedTag = tag === "root" ? "DIV" : tag.toUpperCase();
		expect(element?.tagName).toBe(expectedTag);
	});

	test("the caption names the table", () => {
		renderTable();
		expect(screen.getByRole("table", { name: "Recent invoices" })).toBeInTheDocument();
	});

	test("Table.Header defaults scope to col and keeps an explicit scope", () => {
		renderTable();
		expect(screen.getByRole("columnheader", { name: "Invoice" })).toHaveAttribute("scope", "col");
		expect(screen.getByRole("columnheader", { name: "Amount" })).toHaveAttribute(
			"scope",
			"colgroup",
		);
	});

	test("a callback ref on Table.Root fires once with the scroll container across a re-render", () => {
		const refSpy = vi.fn<(node: HTMLDivElement | null) => void>();
		// Why a factory: React bails out of a re-render when it receives the same
		// element object, so each render needs fresh elements with the same props.
		const renderTree = () => (
			<Table.Root ref={refSpy}>
				<Table.Element>
					<Table.Body>
						<Table.Row>
							<Table.Cell>INV001</Table.Cell>
						</Table.Row>
					</Table.Body>
				</Table.Element>
			</Table.Root>
		);
		const { rerender } = render(renderTree());
		rerender(renderTree());

		expect(refSpy).toHaveBeenCalledTimes(1);
		expect(refSpy).toHaveBeenLastCalledWith(screen.getByRole("table").parentElement);
	});

	test("Table.Root stamps the overflow attributes with values, and no sticky flag while nothing overflows", () => {
		renderTable();
		const root = screen.getByTestId("root");
		expect(root).toHaveAttribute("data-x-overflow", "false");
		expect(root).toHaveAttribute("data-x-scroll-end", "false");
		expect(root).not.toHaveAttribute("data-sticky-active");
	});
});
