import { existsSync } from "node:fs";
import path from "node:path";
import { expect, it } from "vitest";
import { formatMigrationNumber, migrations, migrationsNewestFirst } from "./navigation-data";

const migrationsDirectory = path.resolve(import.meta.dirname, "../docs/migrations");

it("formatMigrationNumber zero-pads to four digits and leaves a wider number alone", () => {
	expect(formatMigrationNumber(6)).toBe("0006");
	expect(formatMigrationNumber(42)).toBe("0042");
	expect(formatMigrationNumber(12345)).toBe("12345");
});

it("numbers the guides from 1 with no gaps, in publish order", () => {
	// Why the relation: `number` is the sidebar's React key and the badge text,
	// and a guide keeps it forever. A reused or skipped number is a data error.
	expect(migrations.map((migration) => migration.number)).toEqual(
		migrations.map((_, index) => index + 1),
	);
});

it("has an MDX file on disk for each migration guide's route", () => {
	for (const migration of migrations) {
		const file = path.join(migrationsDirectory, `${migration.route.split("/").pop()}.mdx`);
		expect(existsSync(file), `${migration.title} at ${file}`).toBe(true);
	}
});

it("routes each guide at its padded number and slug", () => {
	// Why the relation: the migrations list renders `number` as the badge and
	// `route` as the link, and both are hand-written literals.
	for (const migration of migrations) {
		expect(migration.route).toBe(
			`/migrations/${formatMigrationNumber(migration.number)}-${migration.slug}`,
		);
	}
});

it("migrationsNewestFirst sorts the guides by number, highest first", () => {
	// Why not a literal list: a new guide must not need an edit here.
	expect(migrationsNewestFirst.map((migration) => migration.number)).toEqual(
		migrations.map((migration) => migration.number).toSorted((a, b) => b - a),
	);
});
