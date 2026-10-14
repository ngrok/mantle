#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const repoRoot = path.resolve(import.meta.dirname, "..");
const docsOrigin = "https://mantle.ngrok.com";

/** The directories a migration number resolves against. */
export type MigrationPaths = {
	/** Holds one `NNNN-<slug>-migration.mdx` page per migration. */
	docsDir: string;
	/** Holds one `NNNN-<slug>/rules.yml` codemod per migration that has one. */
	rulesDir: string;
};

/** A migration doc page and, when one ships, its codemod. */
export type Migration = {
	/** The zero-padded number, such as `0008`. */
	number: string;
	/** The doc page URL on the docs site. */
	docUrl: string;
	/** The ast-grep rules file, or `null` when the migration is manual. */
	rulesPath: string | null;
};

/** The parsed command line. */
export type CliOptions = {
	/** The migration number as typed, or `null` when the command line has none. */
	number: string | null;
	dryRun: boolean;
	help: boolean;
	/** The files or directories to rewrite. Defaults to the working directory. */
	targets: string[];
};

export const defaultPaths: MigrationPaths = {
	docsDir: path.join(repoRoot, "apps/www/app/docs/migrations"),
	rulesDir: path.join(repoRoot, "packages/mantle/migrations"),
};

const usage = `Usage: pnpm -w run migrate <NNNN> [--dry-run] [path ...]

Apply the ast-grep codemod for one mantle migration to the given paths.
Paths default to the working directory.

Options:
  --dry-run   Print the rewrites without applying them.
  -h, --help  Show this help text.`;

/**
 * Parse the command line. The first bare argument is the migration number and
 * every later one is a target path. A lone \`--\` is ignored, so
 * \`pnpm -w run migrate -- 0008 src\` reads the same as \`pnpm -w run migrate 0008 src\`.
 *
 * @example
 * parseCliOptions(["0008", "--dry-run", "apps"]);
 * // { number: "0008", dryRun: true, help: false, targets: ["apps"] }
 */
export function parseCliOptions(argv: readonly string[]): CliOptions {
	const options: CliOptions = { number: null, dryRun: false, help: false, targets: [] };
	for (const argument of argv) {
		if (argument === "--") {
			continue;
		}
		if (argument === "--dry-run") {
			options.dryRun = true;
			continue;
		}
		if (argument === "-h" || argument === "--help") {
			options.help = true;
			continue;
		}
		if (options.number == null) {
			options.number = argument;
			continue;
		}
		options.targets.push(argument);
	}
	return options;
}

/**
 * Pad a migration number to the four digits the docs use, so \`8\` and \`0008\`
 * name the same migration. Returns \`null\` when the input is not a number.
 *
 * @example
 * normalizeMigrationNumber("8"); // "0008"
 * normalizeMigrationNumber("tabs"); // null
 */
export function normalizeMigrationNumber(input: string): string | null {
	if (!/^\d{1,4}$/.test(input)) {
		return null;
	}
	return input.padStart(4, "0");
}

/**
 * List the migration doc slugs (the `.mdx` basenames), sorted by number.
 *
 * @example
 * listMigrationDocs(defaultPaths.docsDir);
 * // ["0001-code-block-migration", "0002-data-table-action-header-migration", …]
 */
export function listMigrationDocs(docsDir: string): string[] {
	if (!fs.existsSync(docsDir)) {
		return [];
	}
	return fs
		.readdirSync(docsDir)
		.filter((entry) => /^\d{4}-.+\.mdx$/.test(entry))
		.map((entry) => entry.replace(/\.mdx$/, ""))
		.toSorted();
}

/**
 * Resolve a migration number to its doc page and its codemod. Returns \`null\`
 * when no doc page carries that number, and a \`rulesPath\` of \`null\` when the
 * migration is manual.
 *
 * @example
 * findMigration("8", defaultPaths);
 * // { number: "0008", docUrl: "https://mantle.ngrok.com/migrations/0008-tabs-separator-migration", rulesPath: "…/0008-tabs-separator/rules.yml" }
 */
export function findMigration(input: string, paths: MigrationPaths): Migration | null {
	const number = normalizeMigrationNumber(input);
	if (number == null) {
		return null;
	}
	const docSlug = listMigrationDocs(paths.docsDir).find((slug) => slug.startsWith(`${number}-`));
	if (docSlug == null) {
		return null;
	}
	const rulesDirName = fs.existsSync(paths.rulesDir)
		? fs.readdirSync(paths.rulesDir).find((entry) => entry.startsWith(`${number}-`))
		: undefined;
	const rulesPath =
		rulesDirName == null ? null : path.join(paths.rulesDir, rulesDirName, "rules.yml");
	return {
		number,
		docUrl: `${docsOrigin}/migrations/${docSlug}`,
		rulesPath: fs.existsSync(rulesPath ?? "") ? rulesPath : null,
	};
}

/**
 * Run the command line and return the exit code. The codemod runs through the
 * repo's own \`ast-grep\` binary with inherited stdio, so its diff or its
 * "Applied N changes" summary prints as-is.
 */
export function main(argv: readonly string[], paths: MigrationPaths = defaultPaths): number {
	const options = parseCliOptions(argv);
	if (options.help) {
		console.log(usage);
		return 0;
	}
	if (options.number == null) {
		console.error(usage);
		return 1;
	}

	const migration = findMigration(options.number, paths);
	if (migration == null) {
		const known = listMigrationDocs(paths.docsDir)
			.map((slug) => `  ${slug}`)
			.join("\n");
		console.error(`Unknown migration "${options.number}". Known migrations:\n${known}`);
		return 1;
	}
	if (migration.rulesPath == null) {
		console.error(`Migration ${migration.number} has no codemod. Read ${migration.docUrl}`);
		return 1;
	}

	const binary = path.join(repoRoot, "node_modules/.bin/ast-grep");
	if (!fs.existsSync(binary)) {
		console.error(`ast-grep is not installed at ${binary}. Run pnpm install first.`);
		return 1;
	}

	const targets = options.targets.length > 0 ? options.targets : ["."];
	const args = ["scan", "--rule", migration.rulesPath];
	if (!options.dryRun) {
		args.push("--update-all");
	}
	args.push(...targets.map((target) => path.resolve(target)));

	const result = spawnSync(binary, args, { stdio: "inherit" });
	if (result.error != null) {
		console.error(result.error.message);
		return 1;
	}
	return result.status ?? 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
	process.exitCode = main(process.argv.slice(2));
}
