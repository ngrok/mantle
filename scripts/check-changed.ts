#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import process from "node:process";
import { pathToFileURL } from "node:url";

/** One command that `check:changed` runs. */
export type CheckStep = {
	name: string;
	command: string;
	args: string[];
};

const lintableFile = /\.(?:[cm]?[jt]sx?)$/;
const formattableFile = /\.(?:[cm]?[jt]sx?|json|jsonc|css|md|mdx|ya?ml)$/;
const agentDocFile = /(?:^|\/)(?:AGENTS|CONVENTIONS)\.md$/;

/**
 * Plan the checks for a set of changed files, cheapest first.
 *
 * Format and lint read only the changed files. Typecheck and tests run through turbo for each package that
 * changed since `base`, plus the packages that depend on it.
 *
 * @example
 * planChecks({ files: ["packages/mantle/src/components/button/button.tsx"], base: "origin/main" });
 * // => fmt, lint, typecheck, and test steps
 */
export function planChecks({
	files,
	base,
}: {
	files: readonly string[];
	base: string;
}): CheckStep[] {
	const formattable = files.filter((file) => formattableFile.test(file));
	const lintable = files.filter((file) => lintableFile.test(file));
	const touchesCode = files.some((file) => lintableFile.test(file) || file.endsWith(".mdx"));
	const steps: CheckStep[] = [];

	if (formattable.length > 0) {
		steps.push({
			name: "fmt",
			command: "pnpm",
			args: ["exec", "oxfmt", "--check", "--no-error-on-unmatched-pattern", ...formattable],
		});
	}
	if (lintable.length > 0) {
		steps.push({
			name: "lint",
			command: "pnpm",
			args: ["exec", "oxlint", "--type-aware", ...lintable],
		});
	}
	if (files.some((file) => agentDocFile.test(file))) {
		steps.push({ name: "agent docs", command: "node", args: ["./scripts/check-agent-docs.ts"] });
	}
	if (touchesCode) {
		const filter = `--filter=...[${base}]`;
		steps.push({
			name: "typecheck",
			command: "pnpm",
			args: ["exec", "turbo", "run", "typecheck", filter],
		});
		steps.push({ name: "test", command: "pnpm", args: ["exec", "turbo", "run", "test", filter] });
	}
	return steps;
}

/**
 * Keep the last `lineCount` lines of command output.
 *
 * @example
 * tailLines({ text: "a\nb\nc\n", lineCount: 2 }); // => "b\nc"
 */
export function tailLines({ text, lineCount }: { text: string; lineCount: number }): string {
	return text.trimEnd().split("\n").slice(-lineCount).join("\n");
}

/** Run git and return its output lines, or fail with git's own message. */
function gitLines(args: string[]): string[] {
	const result = spawnSync("git", args, { encoding: "utf8" });
	if (result.status !== 0) {
		throw new Error(`git ${args.join(" ")} failed:\n${result.stderr}`);
	}
	return result.stdout.split("\n").filter((line) => line.length > 0);
}

/** The files that differ from `base`: committed, staged, unstaged, and untracked. */
function changedFiles(base: string): string[] {
	const files = new Set([
		...gitLines(["diff", "--name-only", "--diff-filter=d", `${base}...HEAD`]),
		...gitLines(["diff", "--name-only", "--diff-filter=d", "HEAD"]),
		...gitLines(["ls-files", "--others", "--exclude-standard"]),
	]);
	return [...files].filter((file) => fs.existsSync(file)).toSorted();
}

function cli(): void {
	const base = process.env.CHECK_BASE ?? "origin/main";
	const files = changedFiles(base);
	const steps = planChecks({ files, base });
	if (steps.length === 0) {
		console.log(`No changed files to check against ${base}.`);
		return;
	}

	const failed: string[] = [];
	for (const step of steps) {
		const result = spawnSync(step.command, step.args, {
			encoding: "utf8",
			maxBuffer: 64 * 1024 * 1024,
		});
		if (result.status === 0) {
			console.log(`✓ ${step.name}`);
			continue;
		}
		failed.push(step.name);
		console.log(`✗ ${step.name}: ${step.command} ${step.args.join(" ")}`);
		console.log(tailLines({ text: `${result.stdout}\n${result.stderr}`, lineCount: 40 }));
	}

	if (failed.length > 0) {
		console.log(
			`check:changed: ${failed.length} of ${steps.length} steps failed (${failed.join(", ")}).`,
		);
		process.exitCode = 1;
		return;
	}
	console.log(`check:changed: all ${steps.length} steps passed for ${files.length} changed files.`);
}

const entryPoint = process.argv[1];
if (entryPoint != null && import.meta.url === pathToFileURL(entryPoint).href) {
	try {
		cli();
	} catch (error) {
		console.error(error instanceof Error ? error.message : error);
		process.exitCode = 1;
	}
}
