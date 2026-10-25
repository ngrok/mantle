// Reads the file that a Claude Code tool call writes, for the hooks in this directory.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

/** Reads a string field of an unknown object, or `null` when the field is absent or not a string. */
function stringField(value: unknown, key: string): string | null {
	if (typeof value !== "object" || value == null || !(key in value)) {
		return null;
	}
	const field: unknown = Reflect.get(value, key);
	return typeof field === "string" && field.length > 0 ? field : null;
}

/**
 * The absolute path of the file that a tool call writes, or `null` when the payload names no file.
 * A relative path resolves against the session `cwd`, which follows a worktree.
 *
 * @example
 * targetFileOf({ cwd: "/repo", tool_input: { file_path: "a.ts" } }); // => "/repo/a.ts"
 */
export function targetFileOf(payload: unknown): string | null {
	const toolInput: unknown =
		typeof payload === "object" && payload != null ? Reflect.get(payload, "tool_input") : null;
	const target = stringField(toolInput, "file_path") ?? stringField(toolInput, "notebook_path");
	if (target == null) {
		return null;
	}
	return path.resolve(stringField(payload, "cwd") ?? process.cwd(), target);
}

/** Reads the hook payload from stdin. A payload that does not parse names no file, so it never stops the session. */
export function readTargetFile(): string | null {
	try {
		return targetFileOf(JSON.parse(fs.readFileSync(0, "utf8")));
	} catch {
		return null;
	}
}

/**
 * The checkout that holds a file: the nearest directory with `pnpm-workspace.yaml`.
 *
 * Why: `CLAUDE_PROJECT_DIR` stays at the main checkout after Claude enters a worktree, and a worktree
 * has its own config and `node_modules`.
 */
export function checkoutRootOf(file: string): string | null {
	for (
		let directory = path.dirname(file);
		directory !== path.dirname(directory);
		directory = path.dirname(directory)
	) {
		if (fs.existsSync(path.join(directory, "pnpm-workspace.yaml"))) {
			return directory;
		}
	}
	return null;
}
