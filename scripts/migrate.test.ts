import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
	defaultPaths,
	findMigration,
	frontmatterValue,
	listMigrationDocs,
	parseCliOptions,
	rulesDirName,
} from "./migrate.ts";

const scriptPath = path.join(import.meta.dirname, "migrate.ts");
const codemodDirs = fs
	.readdirSync(defaultPaths.rulesDir, { withFileTypes: true })
	.filter((entry) => entry.isDirectory())
	.map((entry) => entry.name)
	.toSorted();

// Why two are excluded: a swapped footer is still a two-child footer, and a
// migrated list that had `hideBorder` reads the same as one the codemod never
// saw. A second run undoes 0003 and adds a separator in 0008. Both docs say to
// run once, and the negative cases in each before.tsx pin the guards.
const oneShotMigrations = new Set(["0003-dialog-footer-dom-order", "0008-tabs-separator"]);

/** One `before` and `after` pair, such as `before.tsx` or `before.radix.tsx`. */
type Fixture = { dir: string; name: string };

// A migration ships a `.ts` pair as well when a rule carries
// `language: typescript`, because a rule reaches only its own language. It
// ships a named pair (`before.radix.tsx`) when a rule depends on the whole
// file, such as its imports, so one file cannot hold both cases.
const fixtures: Fixture[] = codemodDirs.flatMap((dir) =>
	fs
		.readdirSync(path.join(defaultPaths.rulesDir, dir))
		.filter((entry) => /^before(\.[\w-]+)?\.tsx?$/.test(entry))
		.map((entry) => ({ dir, name: entry.slice("before".length) })),
);
const idempotentFixtures = fixtures.filter(({ dir }) => !oneShotMigrations.has(dir));

/**
 * Collapse the whitespace and the quote style a codemod leaves behind, so the
 * comparison reads tokens and not the formatter's layout. A rewrite that drops
 * an attribute leaves a double space, an inserted line starts at column zero,
 * the formatter moves a child onto its own line, and a single-quoted attribute
 * the rules only read keeps its quotes until the formatter runs.
 */
function normalize(source: string): string {
	return source
		.replace(/\s+/g, " ")
		.replace(/\s*([<>{}();,])\s*/g, "$1")
		.replace(/'/g, '"')
		.trim();
}

function runMigrate(args: readonly string[]) {
	return spawnSync(process.execPath, [scriptPath, ...args], { encoding: "utf8" });
}

function copyFixture({ dir, name }: Fixture): { file: string; before: string; after: string } {
	const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "mantle-migrate-"));
	const file = path.join(tempDir, `fixture${name.slice(name.lastIndexOf("."))}`);
	const before = fs.readFileSync(path.join(defaultPaths.rulesDir, dir, `before${name}`), "utf8");
	const after = fs.readFileSync(path.join(defaultPaths.rulesDir, dir, `after${name}`), "utf8");
	fs.writeFileSync(file, before);
	return { file, before, after };
}

describe("codemod fixtures", () => {
	// Catches: a rule whose pattern no longer matches, a permuted fix, and a
	// guard that lets a negative case through.
	it.each(fixtures)("$dir rewrites before$name into after$name", (fixture) => {
		const { file, before, after } = copyFixture(fixture);
		const result = runMigrate([fixture.dir, file]);

		expect(result.status).toBe(0);
		const rewritten = fs.readFileSync(file, "utf8");
		expect(normalize(rewritten)).not.toBe(normalize(before));
		expect(normalize(rewritten)).toBe(normalize(after));
	});

	// Catches: a rule that matches its own output, such as a rename whose fix
	// still matches the renamed attribute.
	it.each(idempotentFixtures)("$dir leaves after$name unchanged on a second run", (fixture) => {
		const { file, after } = copyFixture(fixture);
		fs.writeFileSync(file, after);
		const result = runMigrate([fixture.dir, file]);

		expect(result.status).toBe(0);
		expect(fs.readFileSync(file, "utf8")).toBe(after);
	});
});

describe("migrate command line", () => {
	it("ignores a lone -- and reads the first bare argument as the id", () => {
		expect(parseCliOptions(["--", "0008", "--dry-run", "apps", "packages"])).toEqual({
			id: "0008",
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

	// Catches: a slug lookup that needs the number prefix or the -migration suffix,
	// and a number lookup that reads the file name and so misses a slug-named guide.
	it("resolves a slug, with or without its number and suffix, to the same migration", () => {
		const byNumber = findMigration("0008", defaultPaths);

		for (const id of ["tabs-separator", "tabs-separator-migration", "0008-tabs-separator"]) {
			expect(findMigration(id, defaultPaths)).toEqual(byNumber);
		}
		expect(findMigration("separator", defaultPaths)).toBeNull();
	});

	it("names the doc page and exits 1 when a migration has no codemod", () => {
		const result = runMigrate(["0001", os.tmpdir()]);

		expect(result.status).toBe(1);
		expect(result.stderr).toContain(
			"Migration 0001-code-block-migration has no codemod. Read https://mantle.ngrok.com/migrations/0001-code-block-migration",
		);
	});

	it("lists the known migrations and exits 1 for an unknown number", () => {
		const result = runMigrate(["9999"]);

		expect(result.status).toBe(1);
		expect(result.stderr).toContain('Unknown migration "9999"');
		expect(result.stderr).toContain("0008-tabs-separator-migration");
	});

	it("prints the rewrites without applying them on --dry-run", () => {
		const { file, before } = copyFixture({ dir: "0008-tabs-separator", name: ".tsx" });
		const result = runMigrate(["0008", "--dry-run", file]);

		expect(result.status).toBe(0);
		expect(result.stdout).toContain("Tabs.Separator");
		expect(fs.readFileSync(file, "utf8")).toBe(before);
	});
});

// Why a fixed last number: guides after it are named by slug only, so two open
// pull requests never pick the same number. The release numbers them.
const lastNumberedFileName = 35;

describe("migration docs", () => {
	const docNames = listMigrationDocs(defaultPaths.docsDir);
	const guides = docNames.map((name) => {
		const source = fs.readFileSync(path.join(defaultPaths.docsDir, `${name}.mdx`), "utf8");
		return {
			name,
			source,
			fileNumber: name.match(/^(\d{4})-/)?.[1] ?? null,
			number: frontmatterValue(source, "number"),
			introducedIn: frontmatterValue(source, "introducedIn"),
			codemodIn: frontmatterValue(source, "codemodIn"),
		};
	});

	function codemodSection(source: string): string {
		return source.split(/^## /m).find((section) => section.startsWith("Codemod")) ?? "";
	}

	// Catches: a migration doc without the section, and a doc that names the
	// wrong id in its invocation.
	it.each(guides)("$name names its codemod or says why there is none", (guide) => {
		const hasRules = codemodDirs.includes(rulesDirName(guide.name));
		const id = guide.fileNumber ?? rulesDirName(guide.name);
		const expected = hasRules ? `pnpm -w run migrate ${id}` : /manual: \S/;

		expect(codemodSection(guide.source)).toMatch(expected);
	});

	// Catches: a rules directory renamed away from its doc, or left behind
	// after a doc is deleted.
	it.each(codemodDirs)("%s has a doc page and both fixtures", (dir) => {
		expect(docNames).toContain(`${dir}-migration`);
		expect(fs.existsSync(path.join(defaultPaths.rulesDir, dir, "before.tsx"))).toBe(true);
		expect(fs.existsSync(path.join(defaultPaths.rulesDir, dir, "after.tsx"))).toBe(true);
	});

	// Cross-file contract: the fixture tests above run the `@ast-grep/cli`
	// version the root package.json pins, and the bare `ast-grep` npm name is
	// an unrelated package, so the consumer command must name this one.
	it.each(codemodDirs)("%s names the tested ast-grep version in its consumer command", (dir) => {
		const guide = guides.find(({ name }) => name === `${dir}-migration`);

		expect(codemodSection(guide?.source ?? "")).toContain(
			`npx --yes --package=@ast-grep/cli@${astGrepVersion()} ast-grep scan --rule node_modules/@ngrok/mantle/dist/migrations/${dir}.yml`,
		);
	});

	const numberedGuides = guides.filter(({ fileNumber }) => fileNumber != null);
	const slugGuides = guides.filter(({ fileNumber }) => fileNumber == null);

	// Catches: a new guide that picks the next number in its file name, and a
	// numbered file whose frontmatter names another number.
	it.each(numberedGuides)("$name carries a number in its file name only up to 0035", (guide) => {
		expect(Number(guide.fileNumber)).toBeLessThanOrEqual(lastNumberedFileName);
		expect(guide.number).toBe(String(Number(guide.fileNumber)));
	});

	// Catches: a slug-named guide that takes an old unnumbered URL. That URL
	// redirects to its numbered guide, and published changelogs link it.
	it("keeps the slugs of guides 0001 to 0035 for their redirects", () => {
		const legacySlugs = new Set(numberedGuides.map(({ name }) => name.slice("0000-".length)));

		expect(slugGuides.filter(({ name }) => legacySlugs.has(name)).map(({ name }) => name)).toEqual(
			[],
		);
	});

	// Catches: a pull request that writes the number or the release version by
	// hand. `scripts/stamp-migrations.ts` writes them in the release pull request.
	it.each(slugGuides)("$name has a number and versions only from a release", (guide) => {
		const mantleVersion = packageVersion("../packages/mantle/package.json");
		const versions = [guide.introducedIn, guide.codemodIn].filter((version) => version != null);

		expect(guide.number == null).toBe(guide.introducedIn == null);
		expect(guide.codemodIn == null || guide.introducedIn != null).toBe(true);
		expect(versions.filter((version) => !/^\d+\.\d+\.\d+$/.test(version))).toEqual([]);
		expect(versions.filter((version) => compareVersions(version, mantleVersion) > 0)).toEqual([]);
	});

	// Catches: a hand-written `introducedIn` that is not newer than the current
	// version. `changeset version` moves the guide's link into the CHANGELOG in
	// the same release pull request that stamps the guide, and no other pull request does.
	it("links each released slug-named guide in the CHANGELOG section of its release", () => {
		const changelog = fs.readFileSync(
			path.join(import.meta.dirname, "../packages/mantle/CHANGELOG.md"),
			"utf8",
		);
		const unlinked = slugGuides.filter(({ name, introducedIn }) => {
			if (introducedIn == null) {
				return false;
			}
			const start = changelog.indexOf(`\n## ${introducedIn}\n`);
			const end = changelog.indexOf("\n## ", start + 1);
			const section = start === -1 ? "" : changelog.slice(start, end === -1 ? undefined : end);
			return !section.includes(`mantle.ngrok.com/migrations/${name}`);
		});

		expect(unlinked.map(({ name }) => name)).toEqual([]);
	});

	it("numbers the guides from 1 with no gaps or repeats", () => {
		const numbers = guides.flatMap(({ number }) => (number == null ? [] : [Number(number)]));

		expect(numbers.toSorted((a, b) => a - b)).toEqual(numbers.map((_, index) => index + 1));
	});
});

function compareVersions(left: string, right: string): number {
	const [a, b] = [left, right].map((version) => version.split(".").map(Number));
	for (let index = 0; index < 3; index++) {
		const difference = (a?.[index] ?? 0) - (b?.[index] ?? 0);
		if (difference !== 0) {
			return difference;
		}
	}
	return 0;
}

function packageVersion(relativePath: string): string {
	const packageJson: unknown = JSON.parse(
		fs.readFileSync(path.join(import.meta.dirname, relativePath), "utf8"),
	);
	if (
		typeof packageJson !== "object" ||
		packageJson == null ||
		!("version" in packageJson) ||
		typeof packageJson.version !== "string"
	) {
		throw new Error(`${relativePath} has no version`);
	}
	return packageJson.version;
}

function astGrepVersion(): string {
	const packageJson: unknown = JSON.parse(
		fs.readFileSync(path.join(import.meta.dirname, "../package.json"), "utf8"),
	);
	if (
		typeof packageJson !== "object" ||
		packageJson == null ||
		!("devDependencies" in packageJson) ||
		typeof packageJson.devDependencies !== "object" ||
		packageJson.devDependencies == null ||
		!("@ast-grep/cli" in packageJson.devDependencies) ||
		typeof packageJson.devDependencies["@ast-grep/cli"] !== "string"
	) {
		throw new Error("root package.json pins no @ast-grep/cli version");
	}
	return packageJson.devDependencies["@ast-grep/cli"];
}
