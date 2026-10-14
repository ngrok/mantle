import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { defaultPaths, findMigration, listMigrationDocs, parseCliOptions } from "./migrate.ts";

const scriptPath = path.join(import.meta.dirname, "migrate.ts");
const codemodDirs = fs
	.readdirSync(defaultPaths.rulesDir)
	.filter((entry) => /^\d{4}-/.test(entry))
	.toSorted();

// Why two are excluded: a swapped footer is still a two-child footer, and a
// migrated list that had `hideBorder` reads the same as one the codemod never
// saw. A second run undoes 0003 and adds a separator in 0008. Both docs say to
// run once, and the negative cases in each before.tsx pin the guards.
const oneShotMigrations = new Set(["0003", "0008"]);
const idempotentDirs = codemodDirs.filter((dir) => !oneShotMigrations.has(dir.slice(0, 4)));

/**
 * Collapse the whitespace a codemod leaves behind, so the comparison reads
 * tokens and not the formatter's layout. A rewrite that drops an attribute
 * leaves a double space, an inserted line starts at column zero, and the
 * formatter moves a child onto its own line.
 */
function normalize(source: string): string {
	return source
		.replace(/\s+/g, " ")
		.replace(/\s*([<>{}();,])\s*/g, "$1")
		.trim();
}

function runMigrate(args: readonly string[]) {
	return spawnSync(process.execPath, [scriptPath, ...args], { encoding: "utf8" });
}

function copyFixture(dir: string): { file: string; before: string; after: string } {
	const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "mantle-migrate-"));
	const file = path.join(tempDir, "fixture.tsx");
	const before = fs.readFileSync(path.join(defaultPaths.rulesDir, dir, "before.tsx"), "utf8");
	const after = fs.readFileSync(path.join(defaultPaths.rulesDir, dir, "after.tsx"), "utf8");
	fs.writeFileSync(file, before);
	return { file, before, after };
}

describe("codemod fixtures", () => {
	// Catches: a rule whose pattern no longer matches, a permuted fix, and a
	// guard that lets a negative case through.
	it.each(codemodDirs)("%s rewrites before.tsx into after.tsx", (dir) => {
		const { file, before, after } = copyFixture(dir);
		const result = runMigrate([dir.slice(0, 4), file]);

		expect(result.status).toBe(0);
		const rewritten = fs.readFileSync(file, "utf8");
		expect(normalize(rewritten)).not.toBe(normalize(before));
		expect(normalize(rewritten)).toBe(normalize(after));
	});

	// Catches: a rule that matches its own output, such as a rename whose fix
	// still matches the renamed attribute.
	it.each(idempotentDirs)("%s leaves after.tsx unchanged on a second run", (dir) => {
		const { file, after } = copyFixture(dir);
		fs.writeFileSync(file, after);
		const result = runMigrate([dir.slice(0, 4), file]);

		expect(result.status).toBe(0);
		expect(fs.readFileSync(file, "utf8")).toBe(after);
	});
});

describe("migrate command line", () => {
	it("ignores a lone -- and reads the first bare argument as the number", () => {
		expect(parseCliOptions(["--", "0008", "--dry-run", "apps", "packages"])).toEqual({
			number: "0008",
			dryRun: true,
			help: false,
			targets: ["apps", "packages"],
		});
	});

	// Catches: a padStart that pads to the wrong width, or a lookup that reads
	// the number as a prefix of a longer one.
	it("resolves a bare number to the padded doc and its rules file", () => {
		const migration = findMigration("8", defaultPaths);

		expect(migration?.docUrl).toBe(
			"https://mantle.ngrok.com/migrations/0008-tabs-separator-migration",
		);
		expect(migration?.rulesPath).toBe(
			path.join(defaultPaths.rulesDir, "0008-tabs-separator", "rules.yml"),
		);
	});

	it("names the doc page and exits 1 when a migration has no codemod", () => {
		const result = runMigrate(["0001", os.tmpdir()]);

		expect(result.status).toBe(1);
		expect(result.stderr).toContain(
			"Migration 0001 has no codemod. Read https://mantle.ngrok.com/migrations/0001-code-block-migration",
		);
	});

	it("lists the known migrations and exits 1 for an unknown number", () => {
		const result = runMigrate(["9999"]);

		expect(result.status).toBe(1);
		expect(result.stderr).toContain('Unknown migration "9999"');
		expect(result.stderr).toContain("0008-tabs-separator-migration");
	});

	it("prints the rewrites without applying them on --dry-run", () => {
		const { file, before } = copyFixture("0008-tabs-separator");
		const result = runMigrate(["0008", "--dry-run", file]);

		expect(result.status).toBe(0);
		expect(result.stdout).toContain("Tabs.Separator");
		expect(fs.readFileSync(file, "utf8")).toBe(before);
	});
});

describe("migration docs", () => {
	const docSlugs = listMigrationDocs(defaultPaths.docsDir);

	function codemodSection(slug: string): string | undefined {
		const source = fs.readFileSync(path.join(defaultPaths.docsDir, `${slug}.mdx`), "utf8");
		return source.split(/^## /m).find((section) => section.startsWith("Codemod"));
	}

	// Catches: a migration doc without the section, and a doc that names the
	// wrong number in its invocation.
	it.each(docSlugs)("%s names its codemod or says why there is none", (slug) => {
		const number = slug.slice(0, 4);
		const section = codemodSection(slug) ?? "";
		const hasRules = codemodDirs.some((dir) => dir.startsWith(`${number}-`));
		const expected = hasRules ? `pnpm -w run migrate ${number}` : /manual: \S/;

		expect(section).toMatch(expected);
	});

	// Catches: a rules directory renamed away from its doc, or left behind
	// after a doc is deleted.
	it.each(codemodDirs)("%s has a doc page and both fixtures", (dir) => {
		const number = dir.slice(0, 4);

		expect(docSlugs.some((slug) => slug.startsWith(`${number}-`))).toBe(true);
		expect(fs.existsSync(path.join(defaultPaths.rulesDir, dir, "before.tsx"))).toBe(true);
		expect(fs.existsSync(path.join(defaultPaths.rulesDir, dir, "after.tsx"))).toBe(true);
	});
});
