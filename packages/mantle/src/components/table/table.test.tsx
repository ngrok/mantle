import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
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

	test("Table.Root stamps the overflow attributes with values, and no sticky flag while nothing overflows", () => {
		renderTable();
		const root = screen.getByTestId("root");
		expect(root).toHaveAttribute("data-x-overflow", "false");
		expect(root).toHaveAttribute("data-x-scroll-end", "false");
		expect(root).not.toHaveAttribute("data-sticky-active");
	});
});
