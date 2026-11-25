import { expect, it } from "vitest";
import { formatMigrationNumber, migrations, migrationsNewestFirst } from "./navigation-data";

it("formatMigrationNumber zero-pads to four digits, leaves a wider number alone, and names an unreleased guide", () => {
	expect(formatMigrationNumber(6)).toBe("0006");
	expect(formatMigrationNumber(42)).toBe("0042");
	expect(formatMigrationNumber(12345)).toBe("12345");
	expect(formatMigrationNumber(null)).toBe("Unreleased");
});

it("reads each guide's short title, slug, and route from its file", () => {
	expect(migrations.find((migration) => migration.number === 8)).toEqual({
		number: 8,
		slug: "tabs-separator-migration",
		title: "Tabs Separator",
		description: expect.stringContaining("Tabs.Separator"),
		route: "/migrations/0008-tabs-separator-migration",
	});
});

it("migrationsNewestFirst lists unreleased guides, then the rest by number, highest first", () => {
	// Why not a literal list: a new guide must not need an edit here.
	const numbers = migrationsNewestFirst.map((migration) => migration.number);
	const released = numbers.filter((number) => number != null);

	expect(numbers).toEqual([
		...numbers.filter((number) => number == null),
		...released.toSorted((a, b) => b - a),
	]);
	expect(numbers).toHaveLength(migrations.length);
});
