#!/usr/bin/env node

// A Claude Code PostToolUse hook: lint the file an edit just wrote and hand the errors back as context.
// Why it never blocks: the agent fixes every error in one pass instead of stopping on each edit.

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const lintableFile = /\.(?:[cm]?[jt]sx?)$/;

/** Read the file path out of a PostToolUse payload, or `null` when the tool wrote no lintable file. */
function editedFilePath(payload: unknown): string | null {
	if (typeof payload !== "object" || payload == null || !("tool_input" in payload)) {
		return null;
	}
	const toolInput = payload.tool_input;
	if (typeof toolInput !== "object" || toolInput == null || !("file_path" in toolInput)) {
		return null;
	}
	const filePath = toolInput.file_path;
	if (typeof filePath !== "string" || !lintableFile.test(filePath)) {
		return null;
	}
	return filePath;
}

const input = fs.readFileSync(0, "utf8");
const filePath = editedFilePath(JSON.parse(input));
if (filePath != null && fs.existsSync(filePath)) {
	const projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
	const oxlint = path.join(projectDir, "node_modules", ".bin", "oxlint");
	const result = spawnSync(oxlint, ["--type-aware", "--format=unix", "--quiet", filePath], {
		cwd: projectDir,
		encoding: "utf8",
	});
	if (result.status !== 0 && result.stdout.trim().length > 0) {
		const output = {
			hookSpecificOutput: {
				hookEventName: "PostToolUse",
				additionalContext: `oxlint found errors in ${path.relative(projectDir, filePath)}. Fix them before you finish:\n${result.stdout.trim()}`,
			},
		};
		process.stdout.write(JSON.stringify(output));
	}
}
