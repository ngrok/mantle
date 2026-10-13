// @vitest-environment happy-dom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ServicesListPage, SparklinesInAListDemo } from "./sparklines-in-a-list-demo";

/** The cells of one row, in column order: name, kind, status, requests, deploys, owners, created. */
const REQUESTS_CELL = 3;
const CREATED_CELL = 6;

afterEach(() => {
	cleanup();
});

/** The table body's rows. The sr-only chart tables mount only on focus, so no test here sees a second table. */
function getBodyRows(): HTMLElement[] {
	const table = screen.getByRole("table");
	return within(table)
		.getAllByRole("row")
		.filter((row) => row.closest("tbody") != null);
}

/** The row whose name cell reads `name`. */
function getRow(name: string): HTMLElement {
	const row = screen.getByText(name).closest("tr");
	if (row == null) {
		throw new Error(`expected a row named ${name}`);
	}
	return row;
}

/** One cell of the row named `name`, by column position. */
function getCell(name: string, column: number): HTMLElement {
	const cell = within(getRow(name)).getAllByRole("cell")[column];
	if (cell == null) {
		throw new Error(`expected ${name} to have a cell at column ${column}`);
	}
	return cell;
}

describe("ServicesListPage", () => {
	// catches: a label template that drops the service name, so every chart in a
	// column shares one accessible name, or a cell that renders no chart
	it("gives every row two charts, each with a name no other chart shares", () => {
		render(<ServicesListPage />);

		expect(getBodyRows()).toHaveLength(24);
		// Static sparklines: each plot is a named image, not a Tab stop.
		const requests = screen.getAllByRole("img", { name: /^Requests for /u });
		const deploys = screen.getAllByRole("img", { name: /^Deploys for /u });
		expect(requests).toHaveLength(24);
		expect(deploys).toHaveLength(24);

		const names = [...requests, ...deploys].map((chart) => chart.getAttribute("aria-label"));
		expect(new Set(names).size).toBe(48);
		expect(names).toContain("Requests for edge-router, last 30 days");
		expect(names).toContain("Deploys for edge-router, last 12 weeks");
	});

	// catches: a formatter without `notation: "compact"` (renders `1,912,345`),
	// or a total summed from the other series
	it("renders the compact 30-day total beside the requests chart", () => {
		render(<ServicesListPage />);

		// Why queryByText, not textContent: the cell also holds the chart's sr-only
		// description, whose "30 categories" would satisfy a substring check for "0".
		const busiest = getCell("edge-router", REQUESTS_CELL);
		expect(within(busiest).queryByText("1.7M")).not.toBeNull();
		const paused = getCell("pdf-export", REQUESTS_CELL);
		expect(within(paused).queryByText("0")).not.toBeNull();
	});

	// catches: a status lookup that permutes its labels
	it("labels a degraded service's status", () => {
		render(<ServicesListPage />);

		expect(within(getRow("webhook-relay")).queryByText("Degraded")).not.toBeNull();
		expect(within(getRow("pdf-export")).queryByText("Paused")).not.toBeNull();
	});

	// catches: a threshold or a divisor change in the relative age, one row per unit
	it.each([
		["sandbox-env", "3d ago"],
		["ml-scoring", "2w ago"],
		["changelog", "1mo ago"],
		["edge-router", "1y ago"],
	])("dates %s as %s", (name, age) => {
		render(<ServicesListPage />);

		expect(getCell(name, CREATED_CELL).textContent).toBe(age);
	});

	// catches: an owners cell that renders the initials alone, which are
	// aria-hidden, so the stack names nobody
	it("names each owner in the avatar stack", () => {
		render(<ServicesListPage />);

		const [owner] = screen.getAllByRole("img", { name: "Ada Okafor" });
		if (owner == null) {
			throw new Error("expected Ada Okafor to own at least one service");
		}
		expect(within(owner).queryByText("AO")).not.toBeNull();
	});
});

describe("SparklinesInAListDemo", () => {
	// catches: a demo that renders the page outside `AppLayout.Body`, so the
	// framed document has no main landmark
	it("owns the main landmark around the list", () => {
		render(<SparklinesInAListDemo />);

		const main = screen.getByRole("main");
		expect(within(main).queryByRole("heading", { level: 1, name: "Services" })).not.toBeNull();
		expect(within(main).queryByRole("table")).not.toBeNull();
	});
});
