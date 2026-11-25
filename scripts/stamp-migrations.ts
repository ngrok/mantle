#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
	type MigrationPaths,
	defaultPaths,
	frontmatterValue,
	listMigrationDocs,
	rulesDirName,
} from "./migrate.ts";

const repoRoot = path.resolve(import.meta.dirname, "..");
const mantlePackageJson = "packages/mantle/package.json";

/**
 * Stamp each unreleased migration guide (one with no `introducedIn`) with the
 * release `version`. A guide with no `number` takes the next free one, in
 * file-name order, so two guides in one release number by slug. A slug-named
 * guide with a codemod and no `codemodIn` gets `codemodIn`, also when the
 * codemod comes after the guide shipped. Returns the stamped guide names.
 *
 * @example
 * stampMigrations({ paths: defaultPaths, version: "0.96.0" });
 * // ["tabs-overflow-migration"], and its frontmatter now has number: 36 and introducedIn: "0.96.0"
 */
export function stampMigrations({
	paths,
	version,
}: {
	paths: MigrationPaths;
	version: string;
}): string[] {
	const guides = listMigrationDocs(paths.docsDir).map((name) => {
		const file = path.join(paths.docsDir, `${name}.mdx`);
		return { name, file, source: fs.readFileSync(file, "utf8") };
	});
	let nextNumber =
		Math.max(0, ...guides.map(({ source }) => Number(frontmatterValue(source, "number") ?? 0))) + 1;

	const stamped: string[] = [];
	for (const { name, file, source } of guides) {
		const released = frontmatterValue(source, "introducedIn") != null;
		// Why not a released 0001 to 0035: some of them ship a codemod with no
		// `codemodIn`, and a release must not claim it shipped those codemods.
		const needsCodemodIn =
			!(released && /^\d{4}-/.test(name)) &&
			frontmatterValue(source, "codemodIn") == null &&
			fs.existsSync(path.join(paths.rulesDir, rulesDirName(name), "rules.yml"));
		if (released && !needsCodemodIn) {
			continue;
		}
		const lines = [
			...(frontmatterValue(source, "number") == null ? [`number: ${nextNumber++}`] : []),
			...(released ? [] : [`introducedIn: "${version}"`]),
			...(needsCodemodIn ? [`codemodIn: "${version}"`] : []),
		];
		const end = source.indexOf("\n---\n", 4);
		if (!source.startsWith("---\n") || end === -1) {
			throw new Error(`${name}.mdx has no frontmatter block`);
		}
		fs.writeFileSync(file, `${source.slice(0, end)}\n${lines.join("\n")}${source.slice(end)}`);
		stamped.push(name);
	}
	return stamped;
}

function mantleVersion(packageJson: string): string {
	const parsed: unknown = JSON.parse(packageJson);
	if (
		typeof parsed !== "object" ||
		parsed == null ||
		!("version" in parsed) ||
		typeof parsed.version !== "string"
	) {
		throw new Error(`${mantlePackageJson} has no version`);
	}
	return parsed.version;
}

// Why compare with HEAD: `changeset version` runs first and writes the new
// version. When `@ngrok/mantle` does not bump, no guide ships, so nothing is stamped.
if (import.meta.main) {
	const version = mantleVersion(fs.readFileSync(path.join(repoRoot, mantlePackageJson), "utf8"));
	const previous = mantleVersion(
		execFileSync("git", ["show", `HEAD:${mantlePackageJson}`], { cwd: repoRoot, encoding: "utf8" }),
	);
	if (version === previous) {
		console.log(`@ngrok/mantle stays at ${version}. No migration guide to stamp.`);
	} else {
		const stamped = stampMigrations({ paths: defaultPaths, version });
		console.log(
			`Stamped ${stamped.length} migration guide(s) for ${version}: ${stamped.join(", ")}`,
		);
	}
}
