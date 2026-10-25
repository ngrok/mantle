#!/usr/bin/env node

// A Claude Code PostToolUse hook: rewrite the Tailwind classes in the file an edit just wrote to their canonical form.
// Why at once: the agent reads the canonical form back in the same turn instead of meeting it at commit time.

import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";

import { checkoutRootOf, readTargetFile } from "./hook-input.ts";

const file = readTargetFile();
const root = file == null ? null : checkoutRootOf(file);
if (file != null && root != null && /\.tsx?$/.test(file)) {
	const fixer = spawnSync(
		process.execPath,
		[path.join(root, "scripts/tailwind-canonical.ts"), "--write", file],
		{
			cwd: root,
			encoding: "utf8",
		},
	);
	// A fixer failure never undoes the edit; lint-staged runs the fixer again at commit.
	if (fixer.status !== 0) {
		process.stderr.write(fixer.stderr);
	} else if (fixer.stdout.trim().length > 0) {
		const output = {
			hookSpecificOutput: {
				hookEventName: "PostToolUse",
				additionalContext: `scripts/tailwind-canonical.ts rewrote Tailwind classes in ${path.relative(root, file)} to their canonical form. Read the file again before the next edit.`,
			},
		};
		process.stdout.write(JSON.stringify(output));
	}
}
