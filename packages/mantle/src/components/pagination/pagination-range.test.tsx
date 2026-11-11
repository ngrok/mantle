import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { formatPaginationRange, PaginationRange } from "./pagination-range.js";

const noun = { singular: "domain", plural: "domains" };

describe("formatPaginationRange", () => {
	test("shows the range of the page and the total with grouped digits", () => {
		expect(formatPaginationRange({ offset: 20, pageSize: 20, total: 2396, noun })).toBe(
			"21–40 of 2,396 domains",
		);
	});

	test("ends the last page at the total", () => {
		expect(formatPaginationRange({ offset: 2380, pageSize: 20, total: 2396, noun })).toBe(
			"2,381–2,396 of 2,396 domains",
		);
	});

	test("shows a page of one row as that row alone", () => {
		expect(formatPaginationRange({ offset: 40, pageSize: 20, total: 41, noun })).toBe(
			"41 of 41 domains",
		);
	});

	test("shows the last row when the list shrank under the page", () => {
		// The offset points past the end until the page catches up with the list.
		expect(formatPaginationRange({ offset: 60, pageSize: 20, total: 41, noun })).toBe(
			"41 of 41 domains",
		);
	});

	test("shows the total alone when one page holds every row", () => {
		expect(formatPaginationRange({ offset: 0, pageSize: 20, total: 20, noun })).toBe("20 domains");
	});

	test("uses the singular noun for one row", () => {
		expect(formatPaginationRange({ offset: 0, pageSize: 20, total: 1, noun })).toBe("1 domain");
	});

	test("counts results when no noun is set", () => {
		expect(formatPaginationRange({ offset: 0, pageSize: 20, total: 3 })).toBe("3 results");
	});

	test("returns no text for an empty list", () => {
		expect(formatPaginationRange({ offset: 0, pageSize: 20, total: 0, noun })).toBe("");
	});

	test.each([
		["pageSize", { offset: 0, pageSize: 0, total: 3 }],
		["total", { offset: 0, pageSize: 20, total: -1 }],
		["offset", { offset: 1.5, pageSize: 20, total: 3 }],
	])("throws when `%s` is out of range", (name, value) => {
		expect(() => formatPaginationRange(value)).toThrow(`\`${name}\` must be`);
	});
});

describe("PaginationRange", () => {
	test("renders the count line as a live region", () => {
		render(<PaginationRange offset={0} pageSize={20} total={2396} noun={noun} />);
		const status = screen.getByRole("status");
		expect(status).toHaveTextContent("1–20 of 2,396 domains");
		expect(status).toHaveAttribute("data-slot", "pagination-range");
	});

	test("keeps the live region in the DOM while the list is empty", () => {
		// Why: a live region added together with its first text is not announced.
		render(<PaginationRange offset={0} pageSize={20} total={0} noun={noun} />);
		expect(screen.getByRole("status")).toHaveTextContent("");
	});

	test("renders the text in the child with asChild", () => {
		render(
			<PaginationRange asChild offset={0} pageSize={20} total={3} noun={noun}>
				<p />
			</PaginationRange>,
		);
		const status = screen.getByRole("status");
		expect(status.tagName).toBe("P");
		expect(status).toHaveTextContent("3 domains");
	});

	test("throws when the asChild child has children of its own", () => {
		expect(() =>
			render(
				<PaginationRange asChild offset={0} pageSize={20} total={3}>
					<p>Count</p>
				</PaginationRange>,
			),
		).toThrow("must have no children of its own");
	});
});
