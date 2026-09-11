// @vitest-environment happy-dom
import { cleanup, render, screen, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
import {
	type Migration,
	formatMigrationNumber,
	migrationsNewestFirst,
} from "~/components/navigation-data";
import { MigrationsList, filterMigrations } from "./migrations-list";

afterEach(() => {
	cleanup();
});

const fixtures: readonly Migration[] = [
	{
		number: 3,
		slug: "dialog-footer-dom-order-migration",
		title: "Dialog.Footer DOM Order",
		description: "Dialog.Footer now renders children in DOM order.",
		route: "/migrations/0003-dialog-footer-dom-order-migration",
	},
	{
		number: 1,
		slug: "code-block-migration",
		title: "CodeBlock",
		description: "Migrate from PrismJS to the Shiki-powered CodeBlock.",
		route: "/migrations/0001-code-block-migration",
	},
];

describe("filterMigrations", () => {
	it("returns the input list, in its order, for a blank query", () => {
		expect(filterMigrations(fixtures, "")).toBe(fixtures);
		expect(filterMigrations(fixtures, "   ")).toBe(fixtures);
	});

	it("matches the padded number", () => {
		expect(filterMigrations(fixtures, "0001").map((migration) => migration.title)).toEqual([
			"CodeBlock",
		]);
	});

	it("matches the title regardless of case and surrounding whitespace", () => {
		expect(filterMigrations(fixtures, " codeblock ").map((migration) => migration.number)).toEqual([
			1,
		]);
	});

	it("matches a word in the description and a word in the slug", () => {
		expect(filterMigrations(fixtures, "prismjs").map((migration) => migration.number)).toEqual([1]);
		expect(filterMigrations(fixtures, "dom-order").map((migration) => migration.number)).toEqual([
			3,
		]);
	});

	it("returns an empty list when nothing matches", () => {
		expect(filterMigrations(fixtures, "tanstack")).toEqual([]);
	});
});

describe("MigrationsList", () => {
	function renderList() {
		return render(
			<MemoryRouter>
				<MigrationsList />
			</MemoryRouter>,
		);
	}

	it("lists every guide newest first, each linked to its numbered route", () => {
		renderList();

		const links = within(screen.getByRole("list")).getAllByRole("link");
		expect(links.map((link) => link.getAttribute("href"))).toEqual(
			migrationsNewestFirst.map((migration) => migration.route),
		);
		expect(links.map((link) => link.textContent?.slice(0, 4))).toEqual(
			migrationsNewestFirst.map((migration) => formatMigrationNumber(migration.number)),
		);
	});

	it("narrows the list as the user types and restores it on clear", async () => {
		const user = userEvent.setup();
		renderList();
		const input = screen.getByRole("searchbox", { name: "Filter migrations" });

		await user.type(input, "dialog.footer");

		const links = within(screen.getByRole("list")).getAllByRole("link");
		expect(links.map((link) => link.getAttribute("href"))).toEqual([
			"/migrations/0003-dialog-footer-dom-order-migration",
		]);

		await user.clear(input);

		expect(within(screen.getByRole("list")).getAllByRole("link")).toHaveLength(
			migrationsNewestFirst.length,
		);
	});

	it("shows the empty state for a query with no match, and the clear button resets it", async () => {
		const user = userEvent.setup();
		renderList();
		const input = screen.getByRole("searchbox", { name: "Filter migrations" });

		await user.type(input, "no such guide");

		expect(screen.queryByRole("list")).toBeNull();
		expect(
			screen.getByRole("heading", { name: "No migrations match “no such guide”" }),
		).not.toBeNull();

		await user.click(screen.getByRole("button", { name: "Clear filter" }));

		const restoredInput = screen.getByRole("searchbox", { name: "Filter migrations" });
		expect(restoredInput.getAttribute("value")).toBe("");
		expect(document.activeElement).toBe(restoredInput);
		expect(within(screen.getByRole("list")).getAllByRole("link")).toHaveLength(
			migrationsNewestFirst.length,
		);
	});
});
