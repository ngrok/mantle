#!/usr/bin/env node

// A Claude Code PostToolUse hook: lint the file an edit just wrote and hand the findings back as context.
// Why it never blocks: the agent fixes every finding in one pass instead of stopping on each edit.

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { checkoutRootOf, readTargetFile } from "./hook-input.ts";

const lintableFile = /\.(?:[cm]?[jt]sx?)$/;

const file = readTargetFile();
const root = file == null ? null : checkoutRootOf(file);
if (file != null && root != null && lintableFile.test(file) && fs.existsSync(file)) {
	const oxlint = path.join(root, "node_modules", ".bin", "oxlint");
	const relativeFile = path.relative(root, file);
	// Why the root cwd and a relative path: `ignorePatterns` in `.oxlintrc.json` match from the root.
	// Why `--deny-warnings`: CI fails on a warning, so the hook reports one too.
	const result = spawnSync(
		oxlint,
		[
			"--type-aware",
			"--deny-warnings",
			"--no-error-on-unmatched-pattern",
			"--format=unix",
			relativeFile,
		],
		{
			cwd: root,
			encoding: "utf8",
		},
	);
	if (result.status !== 0 && result.stdout.trim().length > 0) {
		const output = {
			hookSpecificOutput: {
				hookEventName: "PostToolUse",
				additionalContext: `oxlint found problems in ${relativeFile}. Fix them before you finish:\n${result.stdout.trim()}`,
			},
		};
		process.stdout.write(JSON.stringify(output));
	}
}
