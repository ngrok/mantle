#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = path.resolve(import.meta.dirname, "..");
const docsOrigin = "https://mantle.ngrok.com";

/** The directories a migration id resolves against. */
export type MigrationPaths = {
	/** Holds one `<name>.mdx` guide per migration, where `<name>` ends in `-migration`. */
	docsDir: string;
	/** Holds one `<name without -migration>/rules.yml` codemod per migration that has one. */
	rulesDir: string;
};

/** A migration guide and, when one ships, its codemod. */
export type Migration = {
	/** The guide's file name without `.mdx`, such as `0008-tabs-separator-migration`. */
	name: string;
	/** The doc page URL on the docs site. */
	docUrl: string;
	/** The ast-grep rules file, or `null` when the migration is manual. */
	rulesPath: string | null;
};

/** The parsed command line. */
export type CliOptions = {
	/** The migration number or slug as typed, or `null` when the command line has none. */
	id: string | null;
	dryRun: boolean;
	help: boolean;
	/** The files or directories to rewrite. Defaults to the working directory. */
	targets: string[];
};

export const defaultPaths: MigrationPaths = {
	docsDir: path.join(repoRoot, "apps/www/app/docs/migrations"),
	rulesDir: path.join(repoRoot, "packages/mantle/migrations"),
};

const usage = `Usage: pnpm -w run migrate <number or slug> [--dry-run] [path ...]

Apply the ast-grep codemod for one mantle migration to the given paths.
Paths default to the working directory. A migration answers to its number
(8 or 0008) and to its slug (tabs-separator).

Options:
  --dry-run   Print the rewrites without applying them.
  -h, --help  Show this help text.`;

/**
 * Parse the command line. The first bare argument is the migration id and
 * every later one is a target path. A lone \`--\` is ignored, so
 * \`pnpm -w run migrate -- 0008 src\` reads the same as \`pnpm -w run migrate 0008 src\`.
 *
 * @example
 * parseCliOptions(["0008", "--dry-run", "apps"]);
 * // { id: "0008", dryRun: true, help: false, targets: ["apps"] }
 */
export function parseCliOptions(argv: readonly string[]): CliOptions {
	const options: CliOptions = { id: null, dryRun: false, help: false, targets: [] };
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
		if (options.id == null) {
			options.id = argument;
			continue;
		}
		options.targets.push(argument);
	}
	return options;
}

/**
 * List the migration guide names (the `.mdx` basenames), sorted by name.
 *
 * @example
 * listMigrationDocs(defaultPaths.docsDir);
 * // ["0001-code-block-migration", …, "tabs-overflow-migration"]
 */
export function listMigrationDocs(docsDir: string): string[] {
	if (!fs.existsSync(docsDir)) {
		return [];
	}
	return fs
		.readdirSync(docsDir)
		.filter((entry) => entry.endsWith(".mdx"))
		.map((entry) => entry.replace(/\.mdx$/, ""))
		.toSorted();
}

/**
 * Read one top-level scalar from a guide's YAML frontmatter, without quotes.
 * Returns `null` when the frontmatter has no such key.
 *
 * @example
 * frontmatterValue('---\nintroducedIn: "0.95.0"\n---\n', "introducedIn"); // "0.95.0"
 */
export function frontmatterValue(source: string, key: string): string | null {
	const frontmatter = source.match(/^---\n([\s\S]*?)\n---\n/)?.[1] ?? "";
	const value = frontmatter.match(new RegExp(`^${key}:\\s*(.+?)(?:\\s+#.*)?\\s*$`, "m"))?.[1];
	return value == null ? null : value.replace(/^(["'])(.*)\1$/, "$2");
}

/**
 * The codemod directory name for a guide: its name without `-migration`.
 *
 * @example
 * rulesDirName("0008-tabs-separator-migration"); // "0008-tabs-separator"
 */
export function rulesDirName(docName: string): string {
	return docName.replace(/-migration$/, "");
}

/**
 * Whether a guide answers to an id: its frontmatter number for a numeric id,
 * else its file name or its rules directory name, each with or without the
 * number prefix.
 */
function matchesId({ docName, source, id }: { docName: string; source: string; id: string }) {
	if (/^\d+$/.test(id)) {
		return frontmatterValue(source, "number") === String(Number(id));
	}
	return [docName, rulesDirName(docName)].some(
		(name) => name === id || name.replace(/^\d{4}-/, "") === id,
	);
}

/**
 * Resolve a migration number or slug to its guide and its codemod. Returns
 * `null` unless exactly one guide answers to the id, and a `rulesPath` of
 * `null` when the migration is manual.
 *
 * @example
 * findMigration("8", defaultPaths);
 * // { name: "0008-tabs-separator-migration", docUrl: "https://mantle.ngrok.com/migrations/0008-tabs-separator-migration", rulesPath: "…/0008-tabs-separator/rules.yml" }
 * findMigration("tabs-separator", defaultPaths); // the same migration
 */
export function findMigration(id: string, paths: MigrationPaths): Migration | null {
	const [name, ...others] = listMigrationDocs(paths.docsDir).filter((docName) =>
		matchesId({
			docName,
			source: fs.readFileSync(path.join(paths.docsDir, `${docName}.mdx`), "utf8"),
			id,
		}),
	);
	// Why refuse two matches: the wrong guide applies the wrong codemod.
	if (name == null || others.length > 0) {
		return null;
	}
	const rulesPath = path.join(paths.rulesDir, rulesDirName(name), "rules.yml");
	return {
		name,
		docUrl: `${docsOrigin}/migrations/${name}`,
		rulesPath: fs.existsSync(rulesPath) ? rulesPath : null,
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
	if (options.id == null) {
		console.error(usage);
		return 1;
	}

	const migration = findMigration(options.id, paths);
	if (migration == null) {
		const known = listMigrationDocs(paths.docsDir)
			.map((name) => `  ${name}`)
			.join("\n");
		console.error(`No single migration matches "${options.id}". Known migrations:\n${known}`);
		return 1;
	}
	if (migration.rulesPath == null) {
		console.error(`Migration ${migration.name} has no codemod. Read ${migration.docUrl}`);
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

if (import.meta.main) {
	process.exitCode = main(process.argv.slice(2));
}
