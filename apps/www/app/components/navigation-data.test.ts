import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { formatMigrationNumber, migrations, migrationsNewestFirst } from "./navigation-data";

const migrationsDirectory = path.resolve(import.meta.dirname, "../docs/migrations");

describe("formatMigrationNumber", () => {
	it("zero-pads to four digits and leaves a wider number alone", () => {
		expect(formatMigrationNumber(6)).toBe("0006");
		expect(formatMigrationNumber(42)).toBe("0042");
		expect(formatMigrationNumber(12345)).toBe("12345");
	});
});

describe("migrations", () => {
	it("numbers the guides from 1 with no gaps, in publish order", () => {
		expect(migrations.map((migration) => migration.number)).toEqual(
			migrations.map((_, index) => index + 1),
		);
	});

	it("routes each guide at its padded number and slug under /migrations", () => {
		for (const migration of migrations) {
			expect(migration.route).toBe(
				`/migrations/${formatMigrationNumber(migration.number)}-${migration.slug}`,
			);
		}
	});

	it("has an MDX file on disk for each guide's route", () => {
		for (const migration of migrations) {
			const file = path.join(migrationsDirectory, `${migration.route.split("/").pop()}.mdx`);
			expect(existsSync(file), `${migration.title} at ${file}`).toBe(true);
		}
	});
});

describe("migrationsNewestFirst", () => {
	it("orders the guides by descending number and leaves the source list alone", () => {
		expect(migrationsNewestFirst.map((migration) => migration.number)).toEqual([6, 5, 4, 3, 2, 1]);
		expect(migrations[0].number).toBe(1);
	});
});
