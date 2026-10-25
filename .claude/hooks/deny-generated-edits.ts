#!/usr/bin/env node

// A Claude Code PreToolUse hook: block a write to a checked-in file that a tool generates or vendors.
// Why: a hand-edit lasts until the next regeneration, so the agent gets the command that writes the file instead.

import process from "node:process";

import { readTargetFile } from "./hook-input.ts";

/** A generated or vendored path, matched on a POSIX path, and how to change it. */
type GeneratedPath = { pattern: RegExp; fix: string };

/**
 * The generated and vendored paths. Each pattern starts at a path segment, not at the repo root,
 * so it also matches inside a worktree under `.claude/worktrees/`.
 */
const generatedPaths: readonly GeneratedPath[] = [
	{
		pattern: /\/apps\/www\/app\/utilities\/__snapshots__\/components-surface\.json$/,
		fix: "This Vitest snapshot records the JSDoc surface. Change the JSDoc, then run `pnpm -F @app/www test -u`.",
	},
	{
		pattern: /\/packages\/[^/]+\/CHANGELOG\.md$/,
		fix: "`changeset version` writes this file at release. Add or edit a `.changeset/*.md` file instead (`pnpm -w run changeset`).",
	},
	{
		// Why the exceptions: `lib/default-config.ts` holds the mantle overrides, and the README is mantle's own.
		pattern: /\/packages\/mantle\/src\/utils\/cx\/vendor\/(?!lib\/default-config\.ts$|README\.md$)/,
		fix: "This file is vendored from cnfast and stays byte-identical to upstream. Put a mantle override in `vendor/lib/default-config.ts`, or re-sync from upstream as `vendor/README.md` describes.",
	},
];

/**
 * The fix for a generated path, or `null` when a hand-edit is fine.
 *
 * @example
 * generatedPathFix("/repo/packages/mantle/CHANGELOG.md"); // => "`changeset version` writes this file…"
 */
function generatedPathFix(absoluteFile: string): string | null {
	const posixFile = absoluteFile.replaceAll("\\", "/");
	return generatedPaths.find(({ pattern }) => pattern.test(posixFile))?.fix ?? null;
}

const file = readTargetFile();
const fix = file == null ? null : generatedPathFix(file);
if (fix != null) {
	process.stderr.write(
		`Blocked: ${file} is generated or vendored. Do not hand-edit it.\n\n${fix}\n`,
	);
	process.exitCode = 2;
}
